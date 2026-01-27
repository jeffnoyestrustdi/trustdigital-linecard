import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    const returnTo = window.location.pathname || "/admin";
    window.location.href =
      "/.auth/login/aad?post_login_redirect_uri=" + encodeURIComponent(returnTo);
  }, []);

  return null;
}
