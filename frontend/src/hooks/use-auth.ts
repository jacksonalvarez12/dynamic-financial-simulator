import {
  signOut as amplifySignOut,
  getCurrentUser,
  signInWithRedirect,
  type AuthUser,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useEffect, useState } from "react";

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          setLoading(true);
          getCurrentUser()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
          break;
        case "signedOut":
          setUser(null);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const signIn = () => signInWithRedirect({ provider: { custom: "Google" } });
  const signOut = () => amplifySignOut();

  return { user, loading, signIn, signOut };
};
