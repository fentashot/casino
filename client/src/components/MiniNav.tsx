import { Link } from "@tanstack/react-router";

export default function MiniNav() {
    return (
        <div className="space-x-4">
            <Link
                to="/expenses/total"
                className="[&.active]:bg-zinc-600 bg-zinc-800 px-2.5 py-1.5 rounded-3xl text-sm "
            >
                Total spent
            </Link>
            <Link
                to="/expenses/list"
                className="[&.active]:bg-zinc-600 bg-zinc-800 px-2.5 py-1.5 rounded-3xl text-sm "
            >
                All Expenses
            </Link>
            <Link
                to="/expenses/create"
                className="[&.active]:bg-zinc-600 bg-zinc-800 px-2.5 py-1.5 rounded-3xl text-sm"
            >
                Create Expense
            </Link>
        </div>
    );
}
