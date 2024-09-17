// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { IWasmd } from "./precompiles/IWasmd.sol";
import { IJson } from "./precompiles/IJson.sol";

contract CW20ERC20Token is ERC20, Ownable {

	address constant WASMD_PRECOMPILE_ADDRESS = 0x9000000000000000000000000000000000000001;
	address constant JSON_PRECOMPILE_ADDRESS = 0x9000000000000000000000000000000000000002;
	IWasmd public WasmdPrecompile;
	IJson public JsonPrecompile;
	string public Cw20Address;

	constructor(string memory Cw20Address_, string memory _name, string memory _symbol, uint256 initialSupply) ERC20(_name, _symbol) {
		WasmdPrecompile = IWasmd(WASMD_PRECOMPILE_ADDRESS);
		JsonPrecompile = IJson(JSON_PRECOMPILE_ADDRESS);
		Cw20Address = Cw20Address_;
		_mint(msg.sender, initialSupply);
	}

	function mint(address account, uint256 amount) external onlyOwner {
		_mint(account, amount);
	}

	// Queries
	function decimals() public view override returns (uint8) {
			string memory req = _curlyBrace(_formatPayload("token_info", "{}"));
			bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
			return uint8(JsonPrecompile.extractAsUint256(response, "decimals"));
	}

	function totalSupply() public view override returns (uint256) {
			string memory req = _curlyBrace(_formatPayload("token_info", "{}"));
			bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
			return JsonPrecompile.extractAsUint256(response, "total_supply");
	}

	function _formatPayload(string memory key, string memory value) internal pure returns (string memory) {
			return _join(_doubleQuotes(key), value, ":");
	}

	function _curlyBrace(string memory s) internal pure returns (string memory) {
			return string.concat("{", string.concat(s, "}"));
	}

	function _doubleQuotes(string memory s) internal pure returns (string memory) {
			return string.concat("\"", string.concat(s, "\""));
	}

	function _join(string memory a, string memory b, string memory separator) internal pure returns (string memory) {
			return string.concat(a, string.concat(separator, b));
	}
}
