import CategoryEntriesTable from "@/components/CategoryEntriesTable";

type Props = {
  facultyCode?: string | null;
  campusCode?: string | null;
  refreshKey: number;
  onMutation?: () => void;
};

export default function ExpenseEntriesTable(props: Props) {
  return <CategoryEntriesTable {...props} category="expense" />;
}
