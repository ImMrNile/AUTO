"use strict";
exports.__esModule = true;
exports.createClient = void 0;
var ssr_1 = require("@supabase/ssr");
function createClient() {
    return ssr_1.createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
exports.createClient = createClient;
