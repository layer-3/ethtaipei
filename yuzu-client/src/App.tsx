import { useEffect, useState } from "react";
import { formatSignificantWithSeparators } from "./components/Decimal";
import { Send } from "./components/Send";
import { Receive } from "./components/Receive";
import "./App.css";

function setThemeColor(color: string) {
    let themeMeta = document.querySelector('meta[name="theme-color"]');

    if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.setAttribute("name", "theme-color");
        document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", color);
}

export function YuzuxApp() {
    const [isSendOpen, setSendOpen] = useState(false);
    const [isReceiveOpen, setReceiveOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        setThemeColor("#000");

        return () => {
            document.body.style.overflow = "auto";
            setThemeColor("#fff");
        };
    }, []);

    return (
        <div className="bg-black flex flex-col p-6 h-full">
            <div className="flex justify-between items-center py-2">
                <h1 className="text-3xl font-bold text-white">Yuzux</h1>
            </div>
            <div className="flex-grow flex items-center justify-center">
                <div className={`text-white text-center`}>
                    <div className="flex flex-col items-center">
                        <span className="text-[56px] font-bold leading-none text-white">$ {formatSignificantWithSeparators(String(100) || "0")}</span>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex justify-between max-w-md mx-auto">
                    <button
                        onClick={() => setReceiveOpen(true)}
                        className="flex-1 mr-2 bg-black text-white py-3 rounded-md hover:bg-gray-900 transition-colors flex items-center justify-center border border-white"
                    >
                        Receive
                    </button>
                    <button
                        onClick={() => setSendOpen(true)}
                        className="flex-1 ml-2 bg-white text-black py-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center border border-white"
                    >
                        Pay
                    </button>
                </div>
            </div>
            <Send isOpen={isSendOpen || false} onClose={() => setSendOpen(false)} />
            <Receive isOpen={isReceiveOpen || false} onClose={() => setReceiveOpen(false)} />
        </div>
    );
}

export default YuzuxApp;
