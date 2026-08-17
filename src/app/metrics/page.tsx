import type { Metadata } from "next";
import MetricsPage from "./metrics-page";

export const metadata: Metadata = {
    title: "Metrics",
};

export default function Page() {
    return <MetricsPage />;
}