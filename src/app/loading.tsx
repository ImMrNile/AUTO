import React from 'react';

const Loading = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* 加载文字 */}
      <div className="text-white text-lg font-medium mb-6">Загрузка</div>

      {/* 旋转加载图标 */}
      <div className="relative w-12 h-12">
        <svg
          className="animate-spin w-full h-full text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      {/* 彩色几何图形 - 移动端更小且下移 */}
      <div className="mt-12 flex flex-wrap gap-2 md:gap-4 justify-center">
        {/* 圆形 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></div>
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-teal-400"></div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-400 to-red-500"></div>

        {/* 正方形 */}
        <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md"></div>
        <div className="w-5 h-5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-md"></div>

        {/* 梯形 */}
        <div className="w-6 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-sm"></div>
      </div>
    </div>
  );
};

export default Loading;