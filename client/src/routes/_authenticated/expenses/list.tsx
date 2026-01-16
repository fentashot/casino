import { createFileRoute } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getAllExpensesQueryOptions } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/expenses/list")({
  component: Expenses,
});

function Expenses() {
  const expensesQuery = useQuery(getAllExpensesQueryOptions);

  if (expensesQuery.isError)
    return (
      <div className="text-center mt-3">
        Error: {expensesQuery.error.message}
      </div>
    );

  const expenses = expensesQuery.data?.expenses;

  return (
    <Wrapper>
      <Table>
        <TableCaption>A list of your expenses.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">id</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expensesQuery.isPending &&
            Array(3)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="w-[100px]">
                    <Skeleton className="h-5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5" />
                  </TableCell>
                </TableRow>
              ))}
          {expenses?.map((data) => (
            <TableRow key={data.id}>
              <TableCell className="w-[100px]">{data.id}</TableCell>
              <TableCell>{data.title}</TableCell>
              <TableCell>{data.amount}</TableCell>
              <TableCell className="text-right">{data.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="p-2 max-w-2xl mx-auto">{children}</div>;
}
