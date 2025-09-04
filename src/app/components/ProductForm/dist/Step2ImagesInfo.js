"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
function Step2ImagesInfo(_a) {
    var formData = _a.formData, imagePreview = _a.imagePreview, additionalImagePreviews = _a.additionalImagePreviews, onInputChange = _a.onInputChange, onImageChange = _a.onImageChange, onAdditionalImagesChange = _a.onAdditionalImagesChange, onRemoveAdditionalImage = _a.onRemoveAdditionalImage, onClearAllAdditionalImages = _a.onClearAllAdditionalImages;
    var handleImageChange = function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            onImageChange(e);
            var reader_1 = new FileReader();
            reader_1.onloadend = function () {
                setFormData(function (prev) { return (__assign(__assign({}, prev), { mainImage: file })); });
                setImagePreview(reader_1.result);
            };
        }
    };
    var handleAdditionalImagesChange = function (e) {
        var files = Array.from(e.target.files || []);
        var imageFiles = files.filter(function (file) { return file.type.startsWith('image/'); });
        if (imageFiles.length > 0) {
            onAdditionalImagesChange({ target: { files: imageFiles } });
        }
    };
    var removeAdditionalImage = function (index) {
        onRemoveAdditionalImage(index);
    };
    var _b = react_1["default"].useState(formData), formDataState = _b[0], setFormData = _b[1];
    var _c = react_1["default"].useState(imagePreview), imagePreviewState = _c[0], setImagePreview = _c[1];
    var _d = react_1["default"].useState(additionalImagePreviews), additionalImagePreviewsState = _d[0], setAdditionalImagePreviews = _d[1];
    react_1["default"].useEffect(function () {
        setFormData(formData);
        setImagePreview(imagePreview);
        setAdditionalImagePreviews(additionalImagePreviews);
    }, [formData, imagePreview, additionalImagePreviews]);
    return (react_1["default"].createElement("div", { className: "space-y-6 animate-fade-in" },
        react_1["default"].createElement("div", { className: "text-center mb-8" },
            react_1["default"].createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-2" }, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0442\u043E\u0432\u0430\u0440\u0430"),
            react_1["default"].createElement("p", { className: "text-gray-600" }, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0418\u0418")),
        react_1["default"].createElement("div", { className: "space-y-4" },
            react_1["default"].createElement("label", { className: "block text-sm font-medium text-gray-700" }, "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 *"),
            imagePreviewState ? (react_1["default"].createElement("div", { className: "relative group" },
                react_1["default"].createElement("img", { src: imagePreviewState, alt: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435", className: "w-full h-64 object-cover rounded-lg border-2 border-gray-200 shadow-md group-hover:shadow-lg transition-all duration-300" }),
                react_1["default"].createElement("button", { type: "button", onClick: function () {
                        setFormData(function (prev) { return (__assign(__assign({}, prev), { mainImage: null })); });
                        setImagePreview('');
                    }, className: "absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100" },
                    react_1["default"].createElement(lucide_react_1.X, { className: "w-4 h-4" })))) : (react_1["default"].createElement("div", { className: "w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all duration-200", onClick: function () { var _a; return (_a = document.getElementById('mainImage')) === null || _a === void 0 ? void 0 : _a.click(); }, onDragOver: function (e) {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                }, onDragLeave: function (e) {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                }, onDrop: function (e) {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    var files = e.dataTransfer.files;
                    if (files.length > 0) {
                        handleImageChange({ target: { name: 'mainImage', files: [files[0]] } });
                    }
                } },
                react_1["default"].createElement(lucide_react_1.Upload, { className: "w-12 h-12 text-gray-400 mb-4" }),
                react_1["default"].createElement("p", { className: "text-gray-600 font-medium mb-2" }, "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435"),
                react_1["default"].createElement("p", { className: "text-sm text-gray-500" }, "PNG, JPG \u0434\u043E 10 \u041C\u0411"))),
            react_1["default"].createElement("input", { id: "mainImage", type: "file", name: "mainImage", accept: "image/*", onChange: handleImageChange, className: "hidden", required: true })),
        react_1["default"].createElement("div", { className: "space-y-4" },
            react_1["default"].createElement("div", { className: "flex items-center justify-between" },
                react_1["default"].createElement("label", { className: "block text-sm font-medium text-gray-700" }, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"),
                additionalImagePreviewsState.length > 0 && (react_1["default"].createElement("button", { type: "button", onClick: onClearAllAdditionalImages, className: "text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2" },
                    react_1["default"].createElement(lucide_react_1.Trash2, { className: "w-4 h-4" }),
                    "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u0441\u0435"))),
            react_1["default"].createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
                additionalImagePreviewsState.map(function (preview, index) { return (react_1["default"].createElement("div", { key: index, className: "relative group" },
                    react_1["default"].createElement("img", { src: preview, alt: "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 " + (index + 1), className: "w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-200" }),
                    react_1["default"].createElement("button", { type: "button", onClick: function () { return removeAdditionalImage(index); }, className: "absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100" },
                        react_1["default"].createElement(lucide_react_1.X, { className: "w-3 h-3" })))); }),
                additionalImagePreviewsState.length < 9 && (react_1["default"].createElement("div", { className: "w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all duration-200", onClick: function () { var _a; return (_a = document.getElementById('additionalImages')) === null || _a === void 0 ? void 0 : _a.click(); }, onDragOver: function (e) {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }, onDragLeave: function (e) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }, onDrop: function (e) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                        var files = e.dataTransfer.files;
                        if (files.length > 0) {
                            handleAdditionalImagesChange({ target: { files: files } });
                        }
                    } },
                    react_1["default"].createElement(lucide_react_1.Plus, { className: "w-8 h-8 text-gray-400 mb-2" }),
                    react_1["default"].createElement("p", { className: "text-sm text-gray-600 font-medium" }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"),
                    react_1["default"].createElement("p", { className: "text-xs text-gray-500" },
                        additionalImagePreviewsState.length,
                        "/9")))),
            react_1["default"].createElement("input", { id: "additionalImages", type: "file", accept: "image/*", multiple: true, onChange: handleAdditionalImagesChange, className: "hidden" }),
            react_1["default"].createElement("p", { className: "text-sm text-gray-500" }, "\u041C\u043E\u0436\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u043E 9 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0435\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0418\u0418")),
        react_1["default"].createElement("div", { className: "space-y-4" },
            react_1["default"].createElement("label", { className: "block text-sm font-medium text-gray-700" }, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043A \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C"),
            react_1["default"].createElement("textarea", { name: "imageComments", value: formDataState.imageComments || '', onChange: onInputChange, rows: 3, className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 resize-none", placeholder: "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0442\u043E\u0432\u0430\u0440\u0435, \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u0432\u0438\u0434\u043D\u043E \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u0445 (\u0446\u0432\u0435\u0442, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B, \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438 \u0442.\u0434.)" }),
            react_1["default"].createElement("p", { className: "text-xs text-gray-500" }, "\u042D\u0442\u0438 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043F\u043E\u043C\u043E\u0433\u0443\u0442 \u0418\u0418 \u043B\u0443\u0447\u0448\u0435 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438"))));
}
exports["default"] = Step2ImagesInfo;
