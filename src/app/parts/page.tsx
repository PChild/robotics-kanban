import type { Metadata } from "next";
import PartsPage from "./parts-page";

export const metadata: Metadata = {
    title: "Parts",
};

export default function Page() {
    return <PartsPage />;
}