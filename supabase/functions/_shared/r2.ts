import { AwsClient } from 'npm:aws4fetch@1.0.20';

type PresignOptions = {
  method: 'GET' | 'PUT';
  objectKey: string;
  expiresIn: number;
  contentType?: string;
  responseContentDisposition?: string;
  responseContentType?: string;
};

type PresignResult = {
  url: string;
  requiredHeaders: Record<string, string>;
};

type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

function firstEnv(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing one of the required environment variables: ${names.join(', ')}`);
}

function optionalEnv(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getR2Config(): R2Config {
  return {
    accountId: firstEnv(['R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID']),
    bucketName: firstEnv(['R2_BUCKET_NAME', 'R2_BUCKET']),
    accessKeyId: firstEnv(['R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID']),
    secretAccessKey: firstEnv(['R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']),
    sessionToken: optionalEnv(['R2_SESSION_TOKEN', 'CLOUDFLARE_R2_SESSION_TOKEN']),
  };
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function buildObjectUrl(config: R2Config, objectKey: string) {
  return new URL(
    `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${encodeObjectKey(objectKey)}`
  );
}

function buildBucketUrl(config: R2Config) {
  return new URL(`https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/`);
}

function createAwsR2Client(config: R2Config) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    sessionToken: config.sessionToken,
    service: 's3',
    region: 'auto',
    retries: 0,
  });
}

function xmlUnescape(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizePathSegment(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export function buildPaidCoursePrefix(courseSlug: string) {
  return `courses/${normalizePathSegment(courseSlug)}/`;
}

export function buildPaidLectureObjectKey(courseSlug: string, lectureSlug: string, objectName = 'source.mp4') {
  const normalizedObjectName = normalizePathSegment(objectName) || 'source.mp4';

  return `${buildPaidCoursePrefix(courseSlug)}${normalizePathSegment(lectureSlug)}/${normalizedObjectName}`;
}

export async function createPresignedR2Url(options: PresignOptions): Promise<PresignResult> {
  const config = getR2Config();
  const aws = createAwsR2Client(config);

  const url = buildObjectUrl(config, options.objectKey);
  url.searchParams.set('X-Amz-Expires', String(options.expiresIn));

  if (options.responseContentDisposition) {
    url.searchParams.set('response-content-disposition', options.responseContentDisposition);
  }
  if (options.responseContentType) {
    url.searchParams.set('response-content-type', options.responseContentType);
  }

  const headers = new Headers();
  const requiredHeaders: Record<string, string> = {};

  if (options.contentType) {
    headers.set('Content-Type', options.contentType);
    requiredHeaders['Content-Type'] = options.contentType;
  }

  const request = await aws.sign(url.toString(), {
    method: options.method,
    headers,
    aws: {
      signQuery: true,
      service: 's3',
      region: 'auto',
      allHeaders: options.contentType ? true : false,
    },
  });

  return {
    url: request.url,
    requiredHeaders,
  };
}

export async function deleteR2Object(objectKey: string) {
  const config = getR2Config();
  const aws = createAwsR2Client(config);
  const response = await aws.fetch(buildObjectUrl(config, objectKey).toString(), {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete R2 object ${objectKey} (HTTP ${response.status})`);
  }
}

export async function deleteR2Objects(objectKeys: string[]) {
  const uniqueKeys = [...new Set(objectKeys.map((key) => key.trim()).filter(Boolean))];

  for (const objectKey of uniqueKeys) {
    await deleteR2Object(objectKey);
  }

  return uniqueKeys;
}

export async function listR2ObjectKeys(prefix: string) {
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    return [];
  }

  const config = getR2Config();
  const aws = createAwsR2Client(config);
  const objectKeys: string[] = [];
  let continuationToken = '';

  while (true) {
    const url = buildBucketUrl(config);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', normalizedPrefix);

    if (continuationToken) {
      url.searchParams.set('continuation-token', continuationToken);
    }

    const response = await aws.fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to list R2 objects for prefix ${normalizedPrefix} (HTTP ${response.status})`);
    }

    const body = await response.text();
    const matches = body.matchAll(/<Key>([\s\S]*?)<\/Key>/g);

    for (const match of matches) {
      objectKeys.push(xmlUnescape(match[1] ?? ''));
    }

    const nextTokenMatch = body.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/);
    continuationToken = xmlUnescape(nextTokenMatch?.[1] ?? '').trim();

    if (!continuationToken) {
      break;
    }
  }

  return objectKeys;
}
