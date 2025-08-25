"use strict";
// lib/supabase/server.ts - Supabase клиент для сервера
exports.__esModule = true;
exports.createServerSupabaseClient = exports.createClient = void 0;
var ssr_1 = require("@supabase/ssr");
var headers_1 = require("next/headers");
function createClient() {
    var cookieStore = headers_1.cookies();
    return ssr_1.createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll: function () {
                return cookieStore.getAll();
            },
            setAll: function (cookiesToSet) {
                try {
                    cookiesToSet.forEach(function (_a) {
                        var name = _a.name, value = _a.value, options = _a.options;
                        cookieStore.set(name, value, options);
                    });
                }
                catch (error) {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            }
        }
    });
}
exports.createClient = createClient;
// Экспортируем старое название для обратной совместимости
exports.createServerSupabaseClient = createClient;
