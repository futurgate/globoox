'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, HelpCircle, LogOut, Loader2, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { APP_THEME_MODE_OPTIONS, APP_THEME_PALETTE_OPTIONS } from '@/lib/theme-options';
import JoinAlphaDialog from '@/components/JoinAlphaDialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';

export default function SettingsPage() {
    const router = useRouter();
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const { user, isAlpha, isAdmin, loading } = useAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const { mode: currentMode, palette: currentColorTheme, setAppTheme } = useAppTheme();

    useEffect(() => {
        const supabase = createClient();
        supabaseRef.current = supabase;
    }, []);

    const handleSignOut = async () => {
        if (!supabaseRef.current) return;
        setSigningOut(true);
        await supabaseRef.current.auth.signOut();
        router.push('/auth');
    };

    const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'User';

    const displayEmail = user?.email || '';
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    return (
        <div className="min-h-screen bg-[var(--app-shell-bg)] pb-[calc(60px+env(safe-area-inset-bottom))] text-[var(--app-text)]">
            <PageHeader title="Settings" />

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-4 space-y-4">
                {loading ? (
                    <Card className="shadow-none">
                        <CardContent className="flex items-center justify-center p-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--app-text-muted)]" />
                        </CardContent>
                    </Card>
                ) : user ? (
                    <>
                        {/* User Info */}
                        <Card className="shadow-none">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="w-16 h-16 rounded-full object-cover"
                                            width={64}
                                            height={64}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-8 h-8 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{displayName}</CardTitle>
                                            {isAlpha && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                    <FlaskConical className="w-3 h-3" />
                                                    Alpha
                                                </span>
                                            )}
                                        </div>
                                        <CardDescription>{displayEmail}</CardDescription>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alpha Tester */}
                        {!isAlpha && (
                            <Card className="shadow-none overflow-hidden">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FlaskConical className="w-5 h-5 text-violet-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Join Alpha Program</p>
                                            <p className="text-xs text-[var(--app-text-muted)]">Get early access to new features</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20"
                                        onClick={() => setShowAccessModal(true)}
                                    >
                                        Join
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Admin tools */}
                        {isAdmin && (
                            <Card className="shadow-none overflow-hidden">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FlaskConical className="w-5 h-5 text-sky-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Translation Playground</p>
                                            <p className="text-xs text-[var(--app-text-muted)]">Compare & score LLM translations (admin)</p>
                                        </div>
                                    </div>
                                    <Link href="/admin/playground">
                                        <Button size="sm" variant="outline" className="shrink-0">Open</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}

                        {/* Appearance */}
                        <div>
                            <p className="px-4 pb-1 text-[13px] font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                                Appearance
                            </p>
                            <Card className="shadow-none bg-[var(--app-surface-bg)] text-[var(--app-text)]">
                                <CardContent className="p-0">
                                    <IOSItemsStack>
                                    <IOSSettingsRow
                                        label="Dark mode"
                                        value={currentMode}
                                        options={APP_THEME_MODE_OPTIONS}
                                        onChange={(id) => setAppTheme(id as 'light' | 'dark' | 'system', currentColorTheme)}
                                    />
                                    <div className="ml-4 h-px bg-[var(--separator-opaque)]" />
                                    <IOSSettingsRow
                                        label="Color theme"
                                        value={currentColorTheme}
                                        options={APP_THEME_PALETTE_OPTIONS}
                                        onChange={(id) => setAppTheme(currentMode, id as 'globoox' | 'default')}
                                    />
                                    </IOSItemsStack>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Other */}
                        <div>
                            <p className="px-4 pb-1 text-[13px] font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                                Other
                            </p>
                            <Card className="shadow-none bg-[var(--app-surface-bg)] text-[var(--app-text)]">
                                <CardContent className="p-0">
                                    <IOSItemsStack>
                                    <Button variant="ghost" asChild className={`${uiMenuItemButton} h-12 !rounded-none justify-start gap-3`}>
                                        <a href="mailto:support@globoox.co">
                                            <HelpCircle className="w-5 h-5" />
                                            Help & Support
                                        </a>
                                    </Button>
                                    <div className="pl-12 pr-4">
                                        <Separator />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={`${uiMenuItemButton} h-12 !rounded-none justify-start gap-3 text-destructive hover:text-destructive`}
                                        onClick={handleSignOut}
                                        disabled={signingOut}
                                    >
                                        {signingOut ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <LogOut className="w-5 h-5" />
                                        )}
                                        Sign Out
                                    </Button>
                                    </IOSItemsStack>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    /* Guest state */
                        <Card className="shadow-none bg-[var(--app-surface-bg)] text-[var(--app-text)]">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center">
                                    <User className="w-8 h-8 text-[var(--app-text-muted)]" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Guest User</CardTitle>
                                    <CardDescription>Sign in to sync your progress</CardDescription>
                                </div>
                            </div>
                            <Button asChild className="mt-4 w-full sm:w-auto">
                                <Link href="/auth">Sign In</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* App Info */}
                <p className="text-center text-xs text-[var(--app-text-muted)]">
                    Globoox v0.1
                </p>
            </div>

            {user && (
                <JoinAlphaDialog
                    open={showAccessModal}
                    onOpenChange={setShowAccessModal}
                    userEmail={user.email ?? ''}
                />
            )}
        </div>
    );
}
