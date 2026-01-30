export default function Footer() {
  return (
    <footer className="w-full bg-black backdrop-blur-3xl border-t border-white/10 text-gray-200 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-12 py-10 md:py-16" style={{ paddingBottom: "max(30px, env(safe-area-inset-bottom))" }}>
        {/* TOP GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 mb-12">
          {/* BRAND */}
          <div className="md:col-span-4 lg:col-span-5 flex flex-col items-start gap-4">
            <div 
              className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <div className="w-16 h-16 relative transition-transform duration-300 group-hover:scale-110 overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500"></div>
                <img
                   src={`${import.meta.env.BASE_URL}image/flowLogo.svg`}
                   alt="FLOW 로고"
                   className="w-full h-full object-contain relative z-10 scale-[1.15]"
                 />
              </div>
              <span className="text-xl md:text-2xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">FLOW</span>
            </div>

            <p className="text-base md:text-lg text-slate-200 leading-relaxed font-medium max-w-sm">
              가족의 건강을 위한<br />
              <span className="text-blue-400 font-black">AI 산책 파트너, Flow</span>와 함께<br />
              더 나은 일상을 경험하세요.
            </p>
          </div>

          {/* LINKS SECTION */}
          <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12">
            {/* SERVICE */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-black text-base tracking-wide border-l-2 border-blue-500 pl-3">서비스</h4>
              <ul className="space-y-3 text-xs md:text-sm text-slate-300">
                <li><a href="#" className="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">서비스 소개</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">요금제</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">고객사례</a></li>
              </ul>
            </div>

            {/* SUPPORT */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-black text-base tracking-wide border-l-2 border-green-500 pl-3">고객지원</h4>
              <ul className="space-y-3 text-xs md:text-sm text-slate-300">
                <li><a href="#" className="hover:text-green-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">FAQ</a></li>
                <li><a href="#" className="hover:text-green-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">이용가이드</a></li>
                <li><a href="#" className="hover:text-green-400 hover:pl-1 transition-all duration-300 block text-slate-200 font-bold">문의하기</a></li>
              </ul>
            </div>

            {/* CONTACT */}
            <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
              <h4 className="text-white font-bold text-base tracking-wide border-l-2 border-purple-500 pl-3">문의</h4>
              <ul className="space-y-4 text-xs md:text-sm text-gray-300">
                <li className="flex items-center gap-2 group">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">📞</span>
                  <span className="group-hover:text-white transition-colors font-medium">1588-0000</span>
                </li>
                <li className="flex items-center gap-2 group">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">📧</span>
                  <span className="group-hover:text-white transition-colors">support@flow.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-600">🕐</span>
                  <span>평일 09:00 - 18:00</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-bold">
          <p className="font-medium">© 2025 FLOW. All rights reserved.</p>

          <div className="flex flex-wrap justify-center gap-8">
            <a href="#" className="hover:text-white transition-colors text-slate-400">이용약관</a>
            <a href="#" className="hover:text-white transition-colors text-slate-400">개인정보처리방침</a>
            <a href="#" className="hover:text-white transition-colors text-slate-400">사업자정보</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
