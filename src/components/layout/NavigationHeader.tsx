"use client";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface NavLink {
	label: string;
	href: string;
}

const links: NavLink[] = [
	{ label: 'Dashboard', href: '/dashboard' },
	{ label: 'Explore', href: '/app' },
	{ label: 'Planner', href: '/planner' },
	{ label: 'Legal', href: '/legal' },
	{ label: 'Upload', href: '/upload' },
	{ label: 'Docs', href: '/docs' }
];

export function NavigationHeader() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		let ticking = false;
		const onScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					setScrolled(window.scrollY > 4);
					ticking = false;
				});
				ticking = true;
			}
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => { setOpen(false); }, [pathname]);

	return (
		<header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'backdrop-blur-lg bg-floatchat-primary/80 shadow-lg shadow-black/20 border-b border-floatchat-border' : 'bg-transparent'}`}>
			<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 bg-floatchat-accent text-white px-3 py-1 rounded-md">Skip to content</a>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="h-16 flex items-center justify-between gap-6">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2 group" aria-label="FloatChat Home">
						<span className="relative inline-flex h-9 w-9 items-center justify-center">
							<span className="absolute inset-0 rounded-full bg-gradient-to-br from-floatchat-accent to-floatchat-gradientTo opacity-90 group-hover:opacity-100 transition" />
							<svg viewBox="0 0 40 40" className="relative w-6 h-6 text-white"><path fill="currentColor" d="M6 22c8 4 20 4 28 0v4c-8 4-20 4-28 0v-4Zm0-8c8 4 20 4 28 0v4c-8 4-20 4-28 0v-4Zm0-8c8 4 20 4 28 0v4C26 14 14 14 6 10V6Z"/></svg>
						</span>
						<span className="font-semibold text-floatchat-ink text-lg tracking-tight">FloatChat</span>
					</Link>

					{/* Desktop Nav */}
						<nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
							{links.map(l => {
								const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href));
								return (
									<Link
										key={l.href}
										href={l.href}
										aria-current={active ? 'page' : undefined}
										className={`px-3 py-2 rounded-md text-sm font-medium relative transition outline-none focus-visible:ring-2 focus-visible:ring-floatchat-accent/60
											${active ? 'text-floatchat-accent bg-floatchat-accentSoft' : 'text-floatchat-inkMuted hover:text-floatchat-ink hover:bg-white/5'}`}
									>
										{l.label}
									</Link>
								);
							})}
						</nav>

					<div className="flex items-center gap-3">
						<Link href="/app" className="hidden sm:inline-block rounded-full bg-floatchat-accent text-white text-sm font-medium px-4 py-2 shadow-neon-cyan hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-floatchat-accent/60">
							Launch Explorer
						</Link>
						<button
							type="button"
							onClick={() => setOpen(o => !o)}
							className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-floatchat-border bg-floatchat-panel backdrop-blur text-floatchat-inkMuted hover:text-floatchat-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-floatchat-accent/60"
							aria-expanded={open}
							aria-label="Toggle navigation menu"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
								{open ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Panel */}
			<div
				className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${open ? 'max-h-96' : 'max-h-0'}`}
				aria-hidden={!open}
			>
				<div className="px-4 pb-6 space-y-4 bg-floatchat-primary/95 backdrop-blur-lg border-t border-floatchat-border">
					<nav className="flex flex-col gap-1" aria-label="Mobile navigation">
						{links.map(l => {
							const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href));
							return (
								<Link
									key={l.href}
									href={l.href}
									aria-current={active ? 'page' : undefined}
									className={`px-4 py-2 rounded-md text-sm font-medium transition ${active ? 'text-floatchat-accent bg-floatchat-accentSoft' : 'text-floatchat-inkMuted hover:text-floatchat-ink hover:bg-white/5'}`}
								>
									{l.label}
								</Link>
							);
						})}
					</nav>
					<Link href="/app" className="block text-center rounded-full bg-floatchat-accent text-white text-sm font-medium px-4 py-2 shadow-neon-cyan hover:brightness-110 transition">
						Launch Explorer
					</Link>
				</div>
			</div>
		</header>
	);
}

export default NavigationHeader;
