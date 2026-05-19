export type Balance = {
  cash_on_bank: number;
  cash_on_hand: number;
  collectibles: number;
  fine_amount: number;
  total_students_with_fines: number;
  faculty_code: string | null;
  campus_code: string | null;
};

export type PublishedReport = {
  id: number;
  file_path: string;
  bucket: string;
};

export type SemesterMeta = {
  name: string;
  yearLabel: string;
};
