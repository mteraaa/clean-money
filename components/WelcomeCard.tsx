type Props = {
  name: string;
  isPublished?: boolean;
  isSemesterEnded?: boolean;
  onAdd?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
};

export default function WelcomeCard({ name, isPublished, isSemesterEnded, onAdd, onPreview, onPublish, onUnpublish }: Props) {
  const locked = isPublished || isSemesterEnded;

  return (
    <div className="bg-white rounded-xl shadow-md px-6 py-4 flex items-center justify-between font-lexend mb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-lexend-exa font-bold text-gray-900 uppercase">{name}</h1>
        {isSemesterEnded && !isPublished && (
          <span className="text-xs font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Semester Ended</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          disabled={locked}
          className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Entry
        </button>
        <button
          onClick={onPreview}
          className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Preview
        </button>
        {isPublished ? (
          <button
            onClick={onUnpublish}
            className="bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Unpublish
          </button>
        ) : (
          <button
            onClick={onPublish}
            className="bg-gray-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Publish
          </button>
        )}
      </div>
    </div>
  );
}
