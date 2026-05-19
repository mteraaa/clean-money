import CategoryEntriesTable from "@/components/entries/CategoryEntriesTable";

type Props = {
  facultyCode?: string | null;
  campusCode?: string | null;
  refreshKey: number;
  onMutation?: () => void;
  isPublished?: boolean;
};

export default function IncomeEntriesTable(props: Props) {
  return <CategoryEntriesTable {...props} category="income" />;
}
