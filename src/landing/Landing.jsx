import { LandingListingsSection } from "./LandingApartmentPreview";
import { POLICY_ROUTES } from "@/legal/policyMeta";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthContext";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";

import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { isTenantRole, resetUnfinishedGoogleSignIn } from "@/services/authService";

import {
    Menu,
    X,
} from "lucide-react";

import {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./landing.css";


/* =========================================================
   LOCATION HELPERS
========================================================= */

const normalizeLocationKey = (value) =>
    value
        .toLocaleLowerCase("en-PH")
        .replace(
            /\b(?:barangay|brgy)\.?\s*/g,
            ""
        )
        .replace(
            /\b(?:sto|santo)\.?\s+/g,
            "sto "
        )
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .trim();


const formatLocationName = (value) =>
    value
        .replace(
            /\b(?:barangay|brgy)\.?\s*/gi,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toLocaleLowerCase("en-PH")
        .replace(
            /(^|\s)\p{L}/gu,
            (letter) =>
                letter.toLocaleUpperCase(
                    "en-PH"
                )
        )
        .replace(
            /^Sto\s+/i,
            "Sto. "
        );


const genericLocationKey =
    /^(?:la paz|lapaz|iloilo|iloilo city|iloilo province|western visayas|philippines|5000)$/;


const streetAddressPattern =
    /^\d|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|block|blk\.?|lot|house|unit)\b/i;


const getInventoryLocation = (
    apartment
) => {
    const scopeText = [
        apartment.city,
        apartment.state,
        apartment.address,
        apartment.location,
    ]
        .filter(Boolean)
        .join(" ");

    if (
        !/\bla\s*paz\b/i.test(
            scopeText
        ) ||
        !/\biloilo\b/i.test(
            scopeText
        )
    ) {
        return null;
    }


    const candidates = [
        apartment.location,
        apartment.city,
    ]
        .filter(
            (value) =>
                Boolean(
                    value?.trim()
                )
        )
        .flatMap(
            (value) =>
                value.split(",")
        )
        .concat(
            (
                apartment.address ||
                ""
            )
                .split(",")
                .reverse()
        );


    for (
        const candidate
        of candidates
    ) {
        const displayName =
            formatLocationName(
                candidate
            );

        const key =
            normalizeLocationKey(
                displayName
            );

        if (
            !key ||
            genericLocationKey.test(
                key
            ) ||
            streetAddressPattern.test(
                displayName
            )
        ) {
            continue;
        }

        return displayName;
    }


    return null;
};


/* =========================================================
   AUTH SCREENS (LAZY)

   The login and signup screens are only needed after a visitor clicks
   Login or Sign Up, so they are downloaded on demand instead of blocking
   the first paint of the landing page. The chunk is warmed as soon as the
   page is idle (and again on hover / focus), which is why the modal still
   opens instantly.
========================================================= */

const loadLoginChunk = () =>
    import("@/auth/Signin");

const loadSignupChunk = () =>
    import("@/auth/Signup");

const loadForgotPasswordChunk = () =>
    import("@/auth/ForgotPassword");

const loadResetPasswordChunk = () =>
    import("@/auth/ResetPassword");

const Login = lazy(() =>
    loadLoginChunk().then((module) => ({
        default: module.Login,
    }))
);

const Signup = lazy(() =>
    loadSignupChunk().then((module) => ({
        default: module.Signup,
    }))
);

const ForgotPassword = lazy(() =>
    loadForgotPasswordChunk().then((module) => ({
        default: module.ForgotPassword,
    }))
);

const ResetPassword = lazy(() =>
    loadResetPasswordChunk().then((module) => ({
        default: module.ResetPassword,
    }))
);

const authScreensFallback = (
    <div
        className="landing-auth-loading"
        role="status"
    >
        Loading...
    </div>
);


/* =========================================================
   LANDING
========================================================= */

export function Landing() {
    const {
        user,
    } = useAuth();


    const {
        apartments,
    } =
        useApartmentsContext();


    const navigate =
        useNavigate();

    const location =
        useLocation();


    /* =====================================================
       WARM THE AUTH CHUNKS

       Runs once the browser is idle so the landing page stays fast while
       the login / signup modal still opens without a visible delay.
    ===================================================== */

    useEffect(() => {
        const warmAuthScreens =
            () => {
                void loadLoginChunk();
                void loadSignupChunk();
                void loadForgotPasswordChunk();
                void loadResetPasswordChunk();
            };


        if (
            typeof window.requestIdleCallback ===
            "function"
        ) {
            const idle =
                window.requestIdleCallback(
                    warmAuthScreens,
                    {
                        timeout: 2500,
                    }
                );


            return () =>
                window.cancelIdleCallback(
                    idle
                );
        }


        const timer =
            window.setTimeout(
                warmAuthScreens,
                1200
            );


        return () =>
            window.clearTimeout(timer);
    }, []);


    /* =====================================================
       LANDING STATE
    ===================================================== */

    const [
        landingSearch,
        setLandingSearch,
    ] = useState("");

    /*
     * Progressive search: whether the
     * suggestions panel is attached to
     * the search field, and which
     * suggestion the keyboard has
     * highlighted.
     */

    const [
        searchFocused,
        setSearchFocused,
    ] = useState(false);

    const [
        activeSuggestionIndex,
        setActiveSuggestionIndex,
    ] = useState(-1);


    const [
        scrolled,
        setScrolled,
    ] = useState(false);


    /* =====================================================
       LOGIN MODAL
    ===================================================== */

    const [
        loginOpen,
        setLoginOpen,
    ] = useState(false);

    const [
        signupOpen,
        setSignupOpen,
    ] = useState(false);

    const [
        forgotPasswordOpen,
        setForgotPasswordOpen,
    ] = useState(false);

    const [
        resetPasswordOpen,
        setResetPasswordOpen,
    ] = useState(false);

    const signupTriggerRef = useRef(null);

    const [
        mobileMenuOpen,
        setMobileMenuOpen,
    ] = useState(false);

    const [
        signupRedirect,
        setSignupRedirect,
    ] = useState(null);


    /*
     * Destination to continue to
     * after successful login.
     */
    const [
        loginRedirect,
        setLoginRedirect,
    ] = useState(null);


    // Public auth URLs share the landing-page modal presentation.
    useEffect(() => {
        if (location.pathname === "/login") {
            setSignupOpen(false);
            setSignupRedirect(null);
            setForgotPasswordOpen(false);
            setResetPasswordOpen(false);
            setLoginOpen(true);
        } else if (location.pathname === "/signup") {
            setLoginOpen(false);
            setForgotPasswordOpen(false);
            setResetPasswordOpen(false);
            setSignupOpen(true);
        } else if (location.pathname === "/forgot-password") {
            setSignupOpen(false);
            setSignupRedirect(null);
            setLoginOpen(false);
            setResetPasswordOpen(false);
            setForgotPasswordOpen(true);
        } else if (location.pathname === "/reset-password") {
            setSignupOpen(false);
            setSignupRedirect(null);
            setLoginOpen(false);
            setForgotPasswordOpen(false);
            setResetPasswordOpen(true);
        } else if (location.pathname === "/") {
            setLoginOpen(false);
            setSignupOpen(false);
            setForgotPasswordOpen(false);
            setResetPasswordOpen(false);
        }
    }, [location.pathname, location.key]);


    /* =====================================================
       PROGRESSIVE SEARCH SUGGESTIONS

       Two suggestion pools are derived from the live inventory:
       - locations  -> barangay / place names (grouped, most
                       populated first)
       - apartments -> unique listing titles

       While the visitor types, both pools are filtered by
       substring. With an empty query the panel shows the most
       popular locations instead, so the search starts being
       useful before a single letter is typed.
    ===================================================== */

    const searchSuggestions =
        useMemo(() => {
            const locations =
                new Map();

            const apartmentsByName =
                new Map();


            apartments
                .filter(
                    isTenantVisibleApartment
                )
                .forEach(
                    (apartment) => {
                        const name =
                            getInventoryLocation(
                                apartment
                            );


                        if (name) {
                            const key =
                                normalizeLocationKey(
                                    name
                                );

                            const existing =
                                locations.get(
                                    key
                                );

                            locations.set(
                                key,
                                existing
                                    ? {
                                          ...existing,
                                          count:
                                              existing.count +
                                              1,
                                      }
                                    : {
                                          label:
                                              name,
                                          count:
                                              1,
                                      }
                            );
                        }


                        const title =
                            apartment
                                ?.title
                                ?.trim();


                        if (title) {
                            const key =
                                title.toLocaleLowerCase(
                                    "en-PH"
                                );

                            const existing =
                                apartmentsByName.get(
                                    key
                                );

                            apartmentsByName.set(
                                key,
                                existing
                                    ? {
                                          ...existing,
                                          count:
                                              existing.count +
                                              1,
                                      }
                                    : {
                                          label:
                                              title,
                                          count:
                                              1,
                                      }
                            );
                        }
                    }
                );


            return {
                locations: [
                    ...locations.values(),
                ].sort(
                    (
                        left,
                        right
                    ) =>
                        right.count -
                            left.count ||
                        left.label.localeCompare(
                            right.label,
                            "en-PH"
                        )
                ),

                apartments: [
                    ...apartmentsByName.values(),
                ].sort(
                    (
                        left,
                        right
                    ) =>
                        right.count -
                            left.count ||
                        left.label.localeCompare(
                            right.label,
                            "en-PH"
                        )
                ),
            };
        }, [apartments]);


    /* =====================================================
       HEADER SCROLL
    ===================================================== */

    useEffect(() => {
        const onScroll =
            () => {
                setScrolled(
                    window.scrollY >
                        20
                );
            };


        window.addEventListener(
            "scroll",
            onScroll
        );


        return () => {
            window.removeEventListener(
                "scroll",
                onScroll
            );
        };
    }, []);


    /* =====================================================
       LOGIN MODAL
       ESC + PREVENT BODY SCROLL
    ===================================================== */

    useEffect(() => {
        // Signup and its nested dialogs use Radix scroll locking / Escape.
        if (!loginOpen) {
            return;
        }


        const previousOverflow =
            document.body.style
                .overflow;


        document.body.style.overflow =
            "hidden";


        const handleKeyDown =
            (event) => {
                if (
                    event.key ===
                    "Escape" && !event.defaultPrevented
                ) {
                    void resetUnfinishedGoogleSignIn().catch(error => console.error("Unable to reset Google sign-in:", error));
                    setLoginOpen(
                        false
                    );

                    setSignupOpen(
                        false
                    );

                    setSignupRedirect(
                        null
                    );

                    setLoginRedirect(
                        null
                    );

                    if (location.pathname === "/login") {
                        navigate("/", { replace: true });
                    }
                }
            };


        window.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {
            document.body.style.overflow =
                previousOverflow;


            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [loginOpen, location.pathname, navigate]);


    /* =====================================================
       DASHBOARD
    ===================================================== */

    const dashboardPath =
        user?.role === "admin"
            ? "/admin"
            : isTenantRole(user?.role)
                ? "/browse"
                : "/landlord/dashboard";


    /* =====================================================
       OPEN / CLOSE LOGIN
    ===================================================== */

    const openLogin = (
        destination = null
    ) => {
        setLoginRedirect(
            destination
        );

        setLoginOpen(
            true
        );
    };

    const openSignup = (destination = null) => {
        signupTriggerRef.current = document.activeElement;
        setLoginOpen(false);
        setSignupRedirect(destination);
        setSignupOpen(true);
    };


    const closeLogin = () => {
        void resetUnfinishedGoogleSignIn().catch(error => console.error("Unable to reset Google sign-in:", error));
        setLoginOpen(
            false
        );

        setLoginRedirect(
            null
        );

        if (location.pathname === "/login") {
            navigate("/", { replace: true });
        }
    };

    const closeSignup = () => {
        void resetUnfinishedGoogleSignIn().catch(error => console.error("Unable to reset Google sign-in:", error));
        setSignupOpen(false);
        setSignupRedirect(null);
        if (location.pathname === "/signup") navigate("/", { replace: true });
    };

    const closeForgotPassword = () => {
        setForgotPasswordOpen(false);
        if (location.pathname === "/forgot-password") navigate("/", { replace: true });
    };

    const closeResetPassword = () => {
        setResetPasswordOpen(false);
        if (location.pathname === "/reset-password") navigate("/", { replace: true });
    };

    const returnToLogin = () => {
        setForgotPasswordOpen(false);
        setResetPasswordOpen(false);
        navigate("/login", { replace: true });
    };


    /* =====================================================
       LOGIN SUCCESS

       Authentication itself is handled
       inside reusable Signin.jsx.
    ===================================================== */

    const handleLoginSuccess =
        (
            loggedInUser
        ) => {
            /*
             * Save this before clearing state.
             */
            const destination =
                loginRedirect;


            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            /*
             * User clicked something protected
             * before signing in.
             */
            if (
                destination && loggedInUser?.role === "admin"
            ) {
                navigate(
                    destination
                );

                return;
            }


            /*
             * Normal login button.
             */
            if (
                loggedInUser?.role ===
                "admin"
            ) {
                navigate(
                    "/admin",
                    {
                        replace: true,
                    }
                );

                return;
            }


            if (
                isTenantRole(
                    loggedInUser?.role
                )
            ) {
                navigate(
                    "/browse",
                    {
                        replace: true,
                    }
                );

                return;
            }


            navigate(
                "/landlord/dashboard",
                {
                    replace: true,
                }
            );
        };


    /* =====================================================
       CREATE ACCOUNT FROM LOGIN
    ===================================================== */

    const handleCreateAccount =
        () => {
            const destination =
                loginRedirect;


            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            openSignup(destination);
        };


    /* =====================================================
       FORGOT PASSWORD
    ===================================================== */

    const handleForgotPassword =
        () => {
            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            setForgotPasswordOpen(true);
            navigate("/forgot-password");
        };


    /* =====================================================
       PROTECTED ACTION
    ===================================================== */

    const handleProtectedAction =
        (event) => {
            if (user) {
                return;
            }


            event?.preventDefault?.();


            const destination =
                event?.currentTarget
                    ?.getAttribute?.(
                        "href"
                    ) ||
                "/browse";


            openLogin(
                destination
            );
        };


    /* =====================================================
       PROGRESSIVE SEARCH

       The query is carried over to the browse page as a
       ?search= parameter. Guests hit the login modal first;
       the destination (including the query) is preserved and
       navigated to right after a successful login.
    ===================================================== */

    const runLandingSearch =
        (rawQuery) => {
            const query =
                rawQuery.trim();


            const params =
                new URLSearchParams();


            if (query) {
                params.set(
                    "search",
                    query
                );
            }


            const destination =
                params.toString()
                    ? `/browse?${params.toString()}`
                    : "/browse";


            if (!user) {
                openLogin(
                    destination
                );

                return;
            }


            navigate(
                destination
            );
        };


    const handleLandingSearch =
        (event) => {
            event.preventDefault();

            runLandingSearch(
                landingSearch
            );
        };


    /*
     * What the dropdown shows right now:
     * - query typed  -> substring matches, locations first
     * - empty + focused -> most popular locations
     */

    const visibleSuggestions =
        useMemo(() => {
            const query =
                landingSearch
                    .trim()
                    .toLocaleLowerCase(
                        "en-PH"
                    );


            if (!query) {
                if (!searchFocused) {
                    return [];
                }

                return searchSuggestions
                    .locations
                    .slice(
                        0,
                        6
                    )
                    .map(
                        (location) => ({
                            ...location,
                            kind:
                                "location",
                        })
                    );
            }


            const matches =
                (suggestion) =>
                    suggestion
                        .label
                        .toLocaleLowerCase(
                            "en-PH"
                        )
                        .includes(query);


            return [
                ...searchSuggestions
                    .locations
                    .filter(matches)
                    .slice(
                        0,
                        4
                    )
                    .map(
                        (location) => ({
                            ...location,
                            kind:
                                "location",
                        })
                    ),

                ...searchSuggestions
                    .apartments
                    .filter(matches)
                    .slice(
                        0,
                        4
                    )
                    .map(
                        (apartment) => ({
                            ...apartment,
                            kind:
                                "apartment",
                        })
                    ),
            ];
        }, [
            landingSearch,
            searchFocused,
            searchSuggestions,
        ]);


    const showSuggestions =
        searchFocused &&
        visibleSuggestions
            .length >
        0;


    /*
     * Typing replaces the match set,
     * so drop the keyboard highlight
     * whenever the query changes.
     */

    useEffect(() => {
        setActiveSuggestionIndex(
            -1
        );
    }, [landingSearch]);


    const selectSuggestion =
        (suggestion) => {
            setLandingSearch(
                suggestion.label
            );

            setSearchFocused(
                false
            );

            setActiveSuggestionIndex(
                -1
            );

            runLandingSearch(
                suggestion.label
            );
        };


    const handleSearchKeyDown =
        (event) => {
            if (
                event.key ===
                "ArrowDown"
            ) {
                event.preventDefault();

                if (
                    !visibleSuggestions
                        .length
                ) {
                    return;
                }

                setActiveSuggestionIndex(
                    (index) =>
                        (index + 1) %
                            visibleSuggestions
                                .length
                );

                return;
            }


            if (
                event.key ===
                "ArrowUp"
            ) {
                event.preventDefault();

                if (
                    !visibleSuggestions
                        .length
                ) {
                    return;
                }

                setActiveSuggestionIndex(
                    (index) =>
                        (index - 1 +
                            visibleSuggestions
                                .length) %
                            visibleSuggestions
                                .length
                );

                return;
            }


            if (
                event.key ===
                "Enter"
            ) {
                const active =
                    visibleSuggestions[
                        activeSuggestionIndex
                    ];


                if (
                    active &&
                    activeSuggestionIndex >=
                        0
                ) {
                    event.preventDefault();

                    selectSuggestion(
                        active
                    );
                }

                return;
            }


            if (
                event.key ===
                "Escape"
            ) {
                setSearchFocused(
                    false
                );

                setActiveSuggestionIndex(
                    -1
                );
            }
        };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="landing-palette landing-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <header
                className={`landing-header ${
                    scrolled
                        ? "landing-header-scrolled"
                        : "landing-header-top"
                }`}
            >

                <div className="landing-container">

                    <div className="landing-header-row">

                        {/* BRAND */}

                        <Link
                            to="/"
                            className="landing-brand"
                        >

                            <img
                                src="/aptfindr-wordmark.png?v=2"
                                alt="AptFindr"
                                className="landing-brand-wordmark"
                            />

                        </Link>


                        {/* =============================
                            DESKTOP NAV
                        ============================= */}

                        <nav className="landing-header-nav">



                            <div className="landing-account-nav">

                                {!user ? (
                                    <>

                                        {/* LOGIN */}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="landing-login-button"
                                            onPointerEnter={() =>
                                                void loadLoginChunk()
                                            }
                                            onFocus={() =>
                                                void loadLoginChunk()
                                            }
                                            onClick={() =>
                                                openLogin()
                                            }
                                        >
                                            Login
                                        </Button>


                                        {/* SIGN UP */}

                                        <Button
                                            type="button"
                                            size="sm"
                                            className="landing-account-button"
                                            onPointerEnter={() =>
                                                void loadSignupChunk()
                                            }
                                            onFocus={() =>
                                                void loadSignupChunk()
                                            }
                                            onClick={() =>
                                                openSignup()
                                            }
                                        >
                                            Sign Up
                                        </Button>

                                    </>
                                ) : (

                                    <Link
                                        to={
                                            dashboardPath
                                        }
                                    >
                                        <Button
                                            size="sm"
                                            className="landing-account-button"
                                        >
                                            Dashboard
                                        </Button>
                                    </Link>

                                )}

                            </div>

                        </nav>


                        {/* =============================
                            MOBILE MENU
                        ============================= */}

                        <Sheet
                            open={mobileMenuOpen}
                            onOpenChange={setMobileMenuOpen}
                        >

                            <SheetTrigger
                                className="landing-menu-trigger"
                                aria-label="Open navigation menu"
                            >

                                <Menu className="landing-menu-icon" />

                            </SheetTrigger>


                            <SheetContent className="landing-menu-panel">

                                <div className="landing-menu-header">
                                    <SheetTitle className="landing-menu-title">
                                        Menu
                                    </SheetTitle>

                                    <SheetDescription className="landing-menu-description">
                                        AptFindr — La Paz, Iloilo City
                                    </SheetDescription>
                                </div>

                                <nav
                                    className="landing-mobile-nav"
                                    aria-label="Mobile navigation"
                                >

                                    {!user ? (
                                        <>

                                            <button
                                                type="button"
                                                className="landing-mobile-link landing-mobile-login-button"
                                                onPointerEnter={() =>
                                                    void loadLoginChunk()
                                                }
                                                onFocus={() =>
                                                    void loadLoginChunk()
                                                }
                                                onClick={() => {
                                                    setMobileMenuOpen(false);
                                                    openLogin();
                                                }}
                                            >
                                                Login
                                            </button>


                                            <button
                                                type="button"
                                                className="landing-mobile-link landing-mobile-link-primary"
                                                onPointerEnter={() =>
                                                    void loadSignupChunk()
                                                }
                                                onFocus={() =>
                                                    void loadSignupChunk()
                                                }
                                                onClick={() => {
                                                    setMobileMenuOpen(false);
                                                    openSignup();
                                                }}
                                            >
                                                Sign Up
                                            </button>

                                        </>
                                    ) : (

                                        <Link
                                            to={
                                                dashboardPath
                                            }
                                            className="landing-mobile-link landing-mobile-link-primary"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Dashboard
                                        </Link>

                                    )}

                                </nav>

                            </SheetContent>

                        </Sheet>

                    </div>

                </div>

            </header>


            {/* =================================================
                HERO
            ================================================= */}

            <section className="landing-hero-section">

                <div className="landing-container">

                    <div className="landing-hero-grid">

                        <div className="landing-hero-content">

                            <h1 className="landing-hero-title">

                                <span className="landing-title-line">
                                    Find Apartments

                                </span>


                                <span className="landing-title-line">

                                    in{" "}

                                    <span className="location-highlight">
                                        La Paz
                                    </span>

                                </span>


                                <span className="landing-title-line">
                                    That Fit Your Needs
                                </span>

                            </h1>


                            <p className="landing-hero-description">
                                Browse verified apartment
                                listings, compare rental
                                options, explore locations,
                                and review room details and
                                amenities all in one place.
                            </p>


                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                LISTINGS
            ================================================= */}

            <div className="landing-listings-wrapper">

                <LandingListingsSection
                    onBrowseClick={
                        handleProtectedAction
                    }
                />

            </div>


            {/* =================================================
                LOAD MORE
            ================================================= */}

            <section className="landing-final-cta">

                <div className="landing-cta-decoration">

                    <div className="landing-cta-glow-top" />

                    <div className="landing-cta-glow-bottom" />

                </div>


                <div className="landing-cta-container">

                    <div className="landing-cta-actions">

                        <Button
                            type="button"
                            size="lg"
                            className="landing-create-button"
                            onClick={() => {

                                if (
                                    user
                                ) {
                                    navigate(
                                        "/browse"
                                    );

                                    return;
                                }


                                openLogin(
                                    "/browse"
                                );

                            }}
                        >
                            Load More
                        </Button>

                    </div>

                </div>

            </section>


            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="landing-footer">
                <div className="landing-section-container">
                    <div className="landing-footer-grid">
                        <div className="landing-footer-about">
                            <p className="landing-footer-brand">AptFindr</p>
                            <p className="landing-footer-description">La Paz, Iloilo City</p>
                            <p className="landing-footer-copyright">© 2026 AptFindr.<br/>All rights reserved.</p>
                        </div>
                        <div className="landing-footer-column">
                            <h4 className="landing-footer-heading">Discover</h4>
                            <ul className="landing-footer-links">
                                <li><span className="landing-footer-link">Browse Apartments</span></li>
                                <li><span className="landing-footer-link">Map View Listings</span></li>
                                <li><span className="landing-footer-link">Verified Apartments</span></li>
                            </ul>
                        </div>
                        <div className="landing-footer-column">
                            <h4 className="landing-footer-heading">Support</h4>
                            <ul className="landing-footer-links">
                                <li><span className="landing-footer-link">Contact Us</span></li>
                                <li><Link to={POLICY_ROUTES.terms} className="landing-footer-link landing-footer-policy-link">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="landing-footer-bottom-band" aria-hidden="true"/>
            </footer>


            {/* =================================================
                FLOATING LOGIN
            ================================================= */}

            {loginOpen && (

                <div
                    className="landing-login-overlay"
                    onMouseDown={(
                        event
                    ) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeLogin();
                        }

                    }}
                >

                    <div
                        className="landing-login-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sign in to AptFindr"
                    >

                        {/* CLOSE */}

                        <button
                            type="button"
                            className="landing-login-close"
                            onClick={
                                closeLogin
                            }
                            aria-label="Close login"
                        >
                            <X size={18} />
                        </button>


                        {/* REUSABLE SIGNIN */}

                        <Suspense
                            fallback={
                                authScreensFallback
                            }
                        >
                            <Login
                                    onSuccess={
                                    handleLoginSuccess
                                }

                                onCreateAccount={
                                    handleCreateAccount
                                }

                                onForgotPassword={
                                    handleForgotPassword
                                }
                            />
                        </Suspense>

                    </div>

                </div>

            )}

            <Dialog open={signupOpen} onOpenChange={(open) => { if (!open) closeSignup(); }}>
                <DialogContent
                    className="landing-login-modal landing-signup-modal"
                    overlayClassName="landing-signup-overlay"
                    onEscapeKeyDown={(event) => {
                        if (document.querySelector(".signup-review-dialog")) event.preventDefault();
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        const trigger = signupTriggerRef.current;
                        if (trigger?.isConnected) trigger.focus();
                        else document.querySelector(".landing-account-button, .landing-mobile-menu-button")?.focus();
                    }}
                >
                    <DialogTitle className="ui-sr-only">Create an AptFindr account</DialogTitle>
                    <DialogDescription className="ui-sr-only">Choose Tenant or Landlord and complete your registration.</DialogDescription>
                    <Suspense
                        fallback={
                            authScreensFallback
                        }
                    >
                        <Signup
                            onClose={closeSignup}
                            embedded
                            redirect={
                                signupRedirect
                            }
                        />
                    </Suspense>
                </DialogContent>
            </Dialog>

            <Dialog open={forgotPasswordOpen} onOpenChange={(open) => { if (!open) closeForgotPassword(); }}>
                <DialogContent className="landing-login-modal landing-signup-modal landing-password-recovery-modal" overlayClassName="landing-signup-overlay">
                    <DialogTitle className="ui-sr-only">Reset your AptFindr password</DialogTitle>
                    <DialogDescription className="ui-sr-only">Request a password reset link for your AptFindr account.</DialogDescription>
                    <Suspense fallback={authScreensFallback}>
                        <ForgotPassword embedded onBackToLogin={returnToLogin} />
                    </Suspense>
                </DialogContent>
            </Dialog>

            <Dialog open={resetPasswordOpen} onOpenChange={(open) => { if (!open) closeResetPassword(); }}>
                <DialogContent className="landing-login-modal landing-signup-modal landing-password-recovery-modal" overlayClassName="landing-signup-overlay">
                    <DialogTitle className="ui-sr-only">Create a new AptFindr password</DialogTitle>
                    <DialogDescription className="ui-sr-only">Set a new password for your AptFindr account.</DialogDescription>
                    <Suspense fallback={authScreensFallback}>
                        <ResetPassword embedded onBackToLogin={returnToLogin} />
                    </Suspense>
                </DialogContent>
            </Dialog>


            {/* =================================================
                TERMS OF SERVICE / PRIVACY POLICY

                The footer above links to the public documents at
                /privacy-policy and /terms-of-service. Those are the real,
                shareable URLs submitted to Supabase, so they must be
                discoverable from the page itself.
            ================================================= */}

        </div>
    );
}
