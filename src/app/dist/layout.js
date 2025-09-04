"use strict";
exports.__esModule = true;
exports.viewport = exports.metadata = void 0;
var google_1 = require("next/font/google");
require("./globals.css");
var inter = google_1.Inter({
    subsets: ['latin', 'cyrillic'],
    display: 'swap'
});
exports.metadata = {
    title: 'WB Automation',
    description: 'Система автоматизации для Wildberries с ИИ-ассистентом',
    keywords: 'wildberries, автоматизация, товары, интернет-магазин, ИИ',
    authors: [{ name: 'WB Automation Team' }],
    creator: 'WB Automation',
    publisher: 'WB Automation',
    formatDetection: {
        email: false,
        address: false,
        telephone: false
    }
};
exports.viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0a0a0a'
};
function RootLayout(_a) {
    var children = _a.children;
    return (React.createElement("html", { lang: "ru", "data-theme": "dark" },
        React.createElement("head", null,
            React.createElement("meta", { name: "apple-mobile-web-app-capable", content: "yes" }),
            React.createElement("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }),
            React.createElement("meta", { name: "apple-mobile-web-app-title", content: "WB Automation" }),
            React.createElement("meta", { name: "mobile-web-app-capable", content: "yes" }),
            React.createElement("meta", { name: "msapplication-TileColor", content: "#0a0a0a" }),
            React.createElement("meta", { name: "msapplication-tap-highlight", content: "no" }),
            React.createElement("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }),
            React.createElement("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" })),
        React.createElement("body", { className: inter.className },
            React.createElement("div", { id: "app-container" },
                React.createElement("div", { className: "animated-background" }),
                React.createElement("div", { className: "floating-shapes" },
                    React.createElement("div", { className: "floating-shape shape-1" }),
                    React.createElement("div", { className: "floating-shape shape-2" }),
                    React.createElement("div", { className: "floating-shape shape-3" }),
                    React.createElement("div", { className: "floating-shape", style: {
                            width: '60px',
                            height: '60px',
                            top: '80%',
                            left: '15%',
                            animationDelay: '-15s',
                            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08))',
                            borderRadius: '30%'
                        } }),
                    React.createElement("div", { className: "floating-shape", style: {
                            width: '120px',
                            height: '120px',
                            top: '20%',
                            right: '25%',
                            animationDelay: '-8s',
                            background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.06))',
                            borderRadius: '60%'
                        } }),
                    React.createElement("div", { className: "floating-shape", style: {
                            width: '40px',
                            height: '40px',
                            top: '50%',
                            left: '5%',
                            animationDelay: '-12s',
                            background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1))',
                            borderRadius: '20%'
                        } })),
                React.createElement("div", { className: "pulse-light-1", style: {
                        position: 'fixed',
                        top: '10%',
                        left: '20%',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        zIndex: -1
                    } }),
                React.createElement("div", { className: "pulse-light-2", style: {
                        position: 'fixed',
                        top: '60%',
                        right: '15%',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.02) 0%, transparent 70%)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        zIndex: -1
                    } }),
                React.createElement("div", { style: {
                        position: 'relative',
                        zIndex: 1,
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column'
                    } }, children)))));
}
exports["default"] = RootLayout;
