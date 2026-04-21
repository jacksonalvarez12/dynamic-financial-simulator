interface Props {
  onSignIn: () => void;
}

export const LoginPage = ({ onSignIn }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
      <div className="text-center max-w-md px-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Dynamic Finance Simulator
        </h1>
        <p className="text-gray-400 mb-10">
          Model your financial future, month by month.
        </p>
        <button
          onClick={onSignIn}
          className="w-full bg-white text-gray-900 font-medium py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
