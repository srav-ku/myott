import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<FirebaseUser | null> {
  try {
    // decodeProtectedHeader reads the JWT *header* (where kid lives).
    // decodeJwt reads the JWT *payload* — kid is NOT there!
    const header = decodeProtectedHeader(token);
    if (!header || !header.kid) return null;

    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { cf: { cacheTtl: 3600 } } as any
    );
    const publicKeys: Record<string, string> = await response.json();

    const cert = publicKeys[header.kid as string];
    if (!cert) return null;

    const key = await importX509(cert, 'RS256');

    const { payload } = await jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    return {
      uid: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}
