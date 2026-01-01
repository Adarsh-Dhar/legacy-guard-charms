pub mod contract;

// Re-export the main contract function
pub use contract::app_contract;

// Re-export types for external use
pub use contract::{Action, VaultState};