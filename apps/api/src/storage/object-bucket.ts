export function resolveObjectBucket(input: {
  publicBucket: string;
  privateBucket?: string;
  access?: 'public' | 'private';
  production?: boolean;
}): { bucket: string; exposePublicUrl: boolean } {
  if (input.access !== 'private') {
    return { bucket: input.publicBucket, exposePublicUrl: true };
  }

  const privateBucket = input.privateBucket?.trim();
  if (input.production) {
    if (!privateBucket || privateBucket === input.publicBucket) {
      throw new Error(
        'R2_PRIVATE_BUCKET must be a distinct, non-public bucket for private uploads',
      );
    }
  }

  return {
    bucket: privateBucket || input.publicBucket,
    exposePublicUrl: false,
  };
}
