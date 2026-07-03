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

export function buildPaidLectureObjectKey(courseId: string, assetId = crypto.randomUUID()) {
  return `courses/${courseId}/lectures/${assetId}/source.mp4`;
}

export async function createPresignedR2Url(options: PresignOptions): Promise<PresignResult> {
  const config = getR2Config();
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    sessionToken: config.sessionToken,
    service: 's3',
    region: 'auto',
    retries: 0,
  });

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
