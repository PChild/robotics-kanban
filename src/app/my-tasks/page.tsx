import type { Metadata } from "next";
import MyTasksPage from "./my-tasks-page";

export const metadata: Metadata = {
    title: "My Tasks",
};

export default function Page() {
    return <MyTasksPage />;
}