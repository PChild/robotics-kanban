import type { Metadata } from "next";
import BoardPage from "./board-page";

export const metadata: Metadata = {
    title: "Kanban",
};

export default function Page() {
    return <BoardPage />;
}