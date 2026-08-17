import type { Metadata } from "next";
import TimeClockPage from "./timeclock-page";

export const metadata: Metadata = {
    title: "Time Clock",
};

export default function Page() {
    return <TimeClockPage />;
}