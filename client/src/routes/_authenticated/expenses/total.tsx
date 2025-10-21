import { getTotalSpentQueryOptions } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
    Card,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/expenses/total")({
    component: Index,
});

function Index() {
    const totalExpensesQuery = useQuery(getTotalSpentQueryOptions);

    if (totalExpensesQuery.isError)
        return (
            <div className="text-center mt-3">
                Error: {totalExpensesQuery.error.message}
            </div>
        );

    return (
        <Card className="flex items-center justify-between px-10 py-8">
            <div>
                <CardTitle className="text-3xl">Total spent</CardTitle>
                <CardDescription className="text-lg">
                    The total amount you've spent
                </CardDescription>
            </div>
            <div className="text-5xl font-semibold">
                {totalExpensesQuery.isPending
                    ? "..."
                    : totalExpensesQuery.data?.total || 0}
            </div>
        </Card>
    );
}

export default Index;
