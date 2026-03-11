export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Wallet SVG icon (Heroicons MIT) */}
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-arkreen to-primary-600 shadow-md shadow-arkreen/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5 text-white"
        >
          <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H5.25Zm7.5 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
        </svg>
      </div>
      <span className="bg-gradient-to-r from-arkreen to-primary-600 bg-clip-text text-xl font-bold text-transparent tracking-tight">
        WalletUI
      </span>
    </div>
  );
}
