'use client';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-t border-amber-200 px-4 py-3">
      <div className="flex items-start gap-3">
        <svg width="20" height="20" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-amber-800 font-medium">法律免责声明</p>
          <p className="text-xs text-amber-700 mt-1">
            本文档由 AI 助手生成，仅供参考，不构成法律建议。请在签署前咨询专业律师进行审核。
          </p>
        </div>
        <button
          onClick={() => {}}
          className="text-amber-600 hover:text-amber-800 text-sm font-medium"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
