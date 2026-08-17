import type { Metadata } from "next";
import LoginPage from "./login-page";

export const metadata: Metadata = {
    title: "Login",
};

export default function Page() {
    return <LoginPage />;
}
