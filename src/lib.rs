#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Crowdfunding {
    #[init]
    fn init(&self, target: BigUint) {
        self.target().set(&target);
    }

    #[view]
    #[storage_mapper("target")]
    fn target(&self) -> SingleValueMapper<BigUint>;
}
