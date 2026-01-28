import React, { createContext, useContext, useState, useMemo } from "react";
import { createTheme, ThemeProvider as MUIThemeProvider } from "@mui/material";

const THEME_KEY = "smartloc_theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark" ? "dark" : "light";
  });

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem(THEME_KEY, newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#0d9488",
            light: "#14b8a6",
            dark: "#0f766e",
            contrastText: "#ffffff",
          },
          secondary: {
            main: "#64748b",
            light: "#94a3b8",
            dark: "#475569",
            contrastText: "#ffffff",
          },
          success: {
            main: "#059669",
            light: "#10b981",
            dark: "#047857",
            contrastText: "#ffffff",
          },
          warning: {
            main: "#ea580c",
            light: "#f97316",
            dark: "#c2410c",
            contrastText: "#ffffff",
          },
          info: {
            main: "#0ea5e9",
            light: "#38bdf8",
            dark: "#0284c7",
            contrastText: "#ffffff",
          },
          error: {
            main: "#ef4444",
            light: "#f87171",
            dark: "#dc2626",
            contrastText: "#ffffff",
          },
          background: {
            default: mode === "dark" ? "#0f172a" : "#f8fafc",
            paper: mode === "dark" ? "#1e293b" : "#ffffff",
          },
          text: {
            primary: mode === "dark" ? "#f1f5f9" : "#1e293b",
            secondary: mode === "dark" ? "#cbd5e1" : "#64748b",
            disabled: mode === "dark" ? "rgba(148, 163, 184, 0.5)" : "rgba(0, 0, 0, 0.38)",
          },
          divider: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.2)",
          action: {
            active: mode === "dark" ? "#14b8a6" : "#0d9488",
            hover: mode === "dark" ? "rgba(13, 148, 136, 0.16)" : "rgba(13, 148, 136, 0.08)",
            selected: mode === "dark" ? "rgba(13, 148, 136, 0.24)" : "rgba(13, 148, 136, 0.12)",
            disabled: mode === "dark" ? "rgba(148, 163, 184, 0.3)" : "rgba(0, 0, 0, 0.26)",
            disabledBackground: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(0, 0, 0, 0.12)",
          },
        },
        typography: {
          fontFamily: '"Outfit", "System UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h1: { fontWeight: 800 },
          h2: { fontWeight: 700 },
          h3: { fontWeight: 700 },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 600 },
        },
        shape: {
          borderRadius: 16,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                fontFamily: '"Outfit", "System UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                ...(mode === "dark" && {
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
                  backgroundAttachment: "fixed",
                  color: "#f1f5f9",
                }),
                transition: "background-color 0.3s ease, color 0.3s ease",
              },
              "*": {
                "&::-webkit-scrollbar": {
                  width: "8px",
                  height: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "dark" ? "#1e293b" : "#f1f5f9",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "dark" ? "#475569" : "#cbd5e1",
                  borderRadius: "4px",
                  "&:hover": {
                    backgroundColor: mode === "dark" ? "#64748b" : "#94a3b8",
                  },
                },
              },
              /* Number input spinner: match field background so it doesn’t turn white on hover */
              ...(mode === "dark"
                ? {
                    "input[type=number]::-webkit-inner-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                    "input[type=number]::-webkit-outer-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                    "input[type=number]:hover::-webkit-inner-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                    "input[type=number]:hover::-webkit-outer-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                    ".MuiOutlinedInput-root:hover input[type=number]::-webkit-inner-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                    ".MuiOutlinedInput-root:hover input[type=number]::-webkit-outer-spin-button": {
                      backgroundColor: "#27272a",
                      background: "#27272a",
                    },
                  }
                : {}),
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                fontFamily: '"Outfit", "System UI", sans-serif',
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 12,
                padding: "8px 20px",
                transition: "all 0.2s ease",
              },
              contained: {
                boxShadow: mode === "dark" 
                  ? "0 4px 14px rgba(13, 148, 136, 0.25)" 
                  : "0 4px 14px rgba(13, 148, 136, 0.15)",
                "&:hover": {
                  boxShadow: mode === "dark" 
                    ? "0 6px 20px rgba(13, 148, 136, 0.35)" 
                    : "0 6px 20px rgba(13, 148, 136, 0.25)",
                  transform: "translateY(-1px)",
                },
              },
              outlined: {
                borderWidth: 1.5,
                "&:hover": {
                  borderColor: "#0d9488",
                  backgroundColor: mode === "dark" ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.06)",
                  transform: "translateY(-1px)",
                },
              },
              text: {
                "&:hover": {
                  backgroundColor: mode === "dark" ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.06)",
                },
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: mode === "dark" ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.08)",
                  transform: "scale(1.05)",
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "dark" ? "rgba(21, 27, 46, 0.8)" : "#ffffff",
                color: mode === "dark" ? "#e2e8f0" : "#1e293b",
                ...(mode === "dark" && {
                  backdropFilter: "blur(10px)",
                }),
                borderBottom: mode === "dark" ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid rgba(148,163,184,0.2)",
                boxShadow: mode === "dark" 
                  ? "0 2px 8px rgba(0, 0, 0, 0.3)" 
                  : "0 1px 3px rgba(0, 0, 0, 0.1)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
                ...(mode === "dark" && {
                  backgroundImage: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                }),
                boxShadow: mode === "dark" 
                  ? "0 4px 24px rgba(0, 0, 0, 0.5), 0 0 1px rgba(148, 163, 184, 0.15)" 
                  : "0 4px 20px rgba(15,23,42,0.06)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                ...(mode === "dark" && {
                  "&:hover": {
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 1px rgba(148, 163, 184, 0.2)",
                    transform: "translateY(-2px)",
                    borderColor: "rgba(148, 163, 184, 0.2)",
                  },
                }),
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
                ...(mode === "dark" && {
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                }),
                boxShadow: mode === "dark" 
                  ? "0 4px 24px rgba(0, 0, 0, 0.5)" 
                  : "0 4px 20px rgba(15,23,42,0.06)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                ...(mode === "dark" && {
                  "&:hover": {
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
                    transform: "translateY(-2px)",
                    borderColor: "rgba(148, 163, 184, 0.2)",
                  },
                }),
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                ...(mode === "dark" && {
                  backgroundColor: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }),
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  ...(mode === "dark" && {
                    backgroundColor: "#27272a",
                    color: "#fafafa",
                    "&:hover": {
                      backgroundColor: "#27272a",
                    },
                  }),
                  "& fieldset": {
                    ...(mode === "dark" && {
                      borderColor: "rgba(161, 161, 170, 0.35)",
                    }),
                  },
                  "&:hover fieldset": {
                    ...(mode === "dark" && {
                      borderColor: "rgba(161, 161, 170, 0.5)",
                    }),
                  },
                  "&.Mui-focused": {
                    ...(mode === "dark" && {
                      backgroundColor: "#3f3f46",
                    }),
                  },
                  "&.Mui-focused fieldset": {
                    ...(mode === "dark" && {
                      borderColor: "rgba(161, 161, 170, 0.6)",
                      borderWidth: "1px",
                    }),
                  },
                  "& input": {
                    ...(mode === "dark" && {
                      color: "#fafafa",
                      "&::placeholder": {
                        color: "#71717a",
                        opacity: 1,
                      },
                    }),
                  },
                },
                "& .MuiInputLabel-root": {
                  ...(mode === "dark" && {
                    color: "#a1a1aa",
                    "&.Mui-focused": {
                      color: "#d4d4d8",
                    },
                  }),
                },
              },
            },
          },
          MuiTable: {
            styleOverrides: {
              root: {
                "& .MuiTableHead-root": {
                  ...(mode === "dark" && {
                    backgroundColor: "rgba(13, 148, 136, 0.08)",
                  }),
                },
                "& .MuiTableRow-root": {
                  "&:hover": {
                    ...(mode === "dark" && {
                      backgroundColor: "rgba(13, 148, 136, 0.08)",
                    }),
                  },
                },
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
                ...(mode === "dark" && {
                  borderRight: "1px solid rgba(148, 163, 184, 0.12)",
                }),
                boxShadow: mode === "dark" 
                  ? "2px 0 24px rgba(0, 0, 0, 0.5)" 
                  : "2px 0 20px rgba(15,23,42,0.06)",
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                ...(mode === "dark" && {
                  "&.Mui-selected": {
                    backgroundColor: "rgba(13, 148, 136, 0.2)",
                    "&:hover": {
                      backgroundColor: "rgba(13, 148, 136, 0.24)",
                    },
                  },
                }),
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                ...(mode === "dark" && {
                  backgroundColor: "#27272a",
                  color: "#fafafa",
                }),
                "& .MuiSelect-icon": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                  ...(mode === "dark" && {
                    color: "#a1a1aa",
                  }),
                },
              },
              icon: {
                backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                ...(mode === "dark" && {
                  color: "#a1a1aa",
                }),
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                ...(mode === "dark" && {
                  backgroundColor: "#27272a",
                  "& .MuiSelect-icon": {
                    backgroundColor: "#27272a !important",
                    color: "#a1a1aa",
                  },
                  "& .MuiSelect-select": {
                    backgroundColor: "transparent",
                  },
                  "& .MuiInputAdornment-root": {
                    backgroundColor: "#27272a !important",
                    "& .MuiSelect-icon": {
                      backgroundColor: "#27272a !important",
                    },
                  },
                }),
                "& .MuiSelect-icon": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                },
                "& .MuiSelect-iconOpen": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                },
                "& .MuiSelect-iconFilled": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                },
                "& .MuiInputAdornment-root": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                  "& .MuiSelect-icon": {
                    backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                  },
                },
              },
              notchedOutline: {
                ...(mode === "dark" && {
                  borderColor: "rgba(161, 161, 170, 0.35)",
                }),
              },
              adornedEnd: {
                "& .MuiSelect-icon": {
                  backgroundColor: mode === "dark" ? "#27272a !important" : "#ffffff !important",
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                ...(mode === "dark" && {
                  backgroundColor: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  color: "#cbd5e1",
                }),
              },
              colorPrimary: {
                ...(mode === "dark" && {
                  backgroundColor: "rgba(13, 148, 136, 0.2)",
                  color: "#14b8a6",
                  border: "1px solid rgba(13, 148, 136, 0.3)",
                }),
              },
              colorSuccess: {
                ...(mode === "dark" && {
                  backgroundColor: "rgba(5, 150, 105, 0.2)",
                  color: "#10b981",
                }),
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
