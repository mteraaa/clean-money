type Props = {
  name: string;
  onAdd?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
};

export default function WelcomeCard({ name, onAdd, onPreview, onPublish }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md px-6 py-4 flex items-center justify-between font-lexend mb-4">
      <h1 className="text-lg font-lexend-exa font-bold text-gray-900 uppercase">{name}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Add Entry
        </button>
        <button
          onClick={onPreview}
          className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Preview
        </button>
        <button onClick={onPublish} className="bg-gray-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-700 transition-colors">
          Publish
        </button>
      </div>
    </div>
  );
}
