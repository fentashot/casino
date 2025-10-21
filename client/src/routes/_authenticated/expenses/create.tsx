import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import type { FieldApi } from '@tanstack/react-form'
import { Loader2Icon } from 'lucide-react'
import { api, getAllExpensesQueryOptions, getTotalSpentQueryOptions } from '@/lib/api'
import { createExpenseSchema } from '@server/zodTypes'
import { Calendar } from '@/components/ui/calendar'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/expenses/create')({
  component: CreateExpense,
})

type FormValues = {
  title: string
  amount: number
  date: string
}

interface CustomFieldInfoProps<TName extends keyof FormValues = keyof FormValues> {
  field: FieldApi<FormValues, TName>
}

function FieldInfo<TName extends keyof FormValues>({ field }: CustomFieldInfoProps<TName>) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors.length ? (
        <em>{field.state.meta.errors.join(', ')}</em>
      ) : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </>
  )
}
function CreateExpense() {
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      title: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
    validators: {
      onChange: createExpenseSchema
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value)
      const res = await api.expenses.$post({ json: value })
      if (!res.ok) {
        throw new Error('Failed to create expense')
      }


      const newExpense = await res.json()
      const existingExpenses = await queryClient.ensureQueryData(getAllExpensesQueryOptions)
      queryClient.setQueryData(getAllExpensesQueryOptions.queryKey, ({
        ...existingExpenses,
        expenses: [...existingExpenses.expenses, newExpense]
      }))

      queryClient.setQueryData(getTotalSpentQueryOptions.queryKey, (oldData?: { total: number }) => {
        return {
          total: (oldData?.total || 0) + Number(newExpense.amount)
        }
      })

      navigate({ to: '/expenses/list' })
    },
  })
  return (
    <div className="max-w-lg mx-auto mt-2 space-y-2">
      <h2 className="text-2xl">Create Expense</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="title"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Title</Label>
              <Input
                type="text"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <form.Field
          name="amount"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Amount</Label>
              <Input
                type="number"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <form.Field
          name="date"
          children={(field) => (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={new Date(field.state.value)}
                onSelect={(date) => field.handleChange((date ?? new Date()).toISOString().split('T')[0])}
                className="rounded-md border shadow"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
          )}
        />
      </form>
    </div>
  )
}
