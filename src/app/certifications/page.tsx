import type { Metadata } from "next";
import CertificationsPage from "./certifications-page";

export const metadata: Metadata = {
    title: "Certifications",
};

export default function Page() {
    return <CertificationsPage />;
}