// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract ERC20Token is ERC20Burnable {

    uint8 private _decimals;

    error ERC20Token__ArraysLengthMismatch();

    constructor(uint8 decimals_) ERC20("ERC20Token", "ERC20") {
        _decimals = decimals_;

        _mint(msg.sender, 1_000_000_000 * 10 ** decimals_);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function batchMint(address[] calldata to, uint256[] calldata amounts) external {
        require(to.length == amounts.length, ERC20Token__ArraysLengthMismatch());

        for (uint256 i; to.length > i; ++i) _mint(to[i], amounts[i]);
    }

    function batchTransfer(address[] calldata to, uint256[] calldata amounts) external {
        require(to.length == amounts.length, ERC20Token__ArraysLengthMismatch());

        for (uint256 i; to.length > i; ++i) _transfer(msg.sender, to[i], amounts[i]);
    }

    function decimals() public view virtual override returns(uint8) {
        return _decimals;
    }

}