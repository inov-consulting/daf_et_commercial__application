import Keycloak from 'keycloak-js';

let _instance: Keycloak | null = null;

/** Singleton Keycloak — toujours la même instance côté client. */
export function getKeycloakInstance(): Keycloak {
  if (!_instance) {
    _instance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
    });
  }
  return _instance;
}

export const logoutKeycloak = async () => {
  const keycloak = getKeycloakInstance();
  try {
    // Clear local state before initiating redirect to prevent loops
    await keycloak.logout({
      // Ensure the redirect matches exactly what is in Keycloak Admin
      redirectUri: window.location.origin 
    });
  } catch (error) {
    console.error("Logout failed", error);
  }
};
