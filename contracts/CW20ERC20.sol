// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {IWasmd} from "./precompiles/IWasmd.sol";
import {IJson} from "./precompiles/IJson.sol";
import {IAddr} from "./precompiles/IAddr.sol";
import {IBank} from "./precompiles/IBank.sol";

contract CW20ERC20Token is ERC20, Ownable {
    address constant WASMD_PRECOMPILE_ADDRESS =
        0x9000000000000000000000000000000000000001;
    address constant JSON_PRECOMPILE_ADDRESS =
        0x9000000000000000000000000000000000000002;
    address constant ADDR_PRECOMPILE_ADDRESS =
        0x9000000000000000000000000000000000000003;
    address constant BANK_PRECOMPILE_ADDRESS =
        0x9000000000000000000000000000000000000004;
    IWasmd public WasmdPrecompile;
    IJson public JsonPrecompile;
    IAddr public AddrPrecompile;
    IBank public BankPrecompile;
    string public Cw20Address;

    constructor(
        string memory Cw20Address_,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        WasmdPrecompile = IWasmd(WASMD_PRECOMPILE_ADDRESS);
        JsonPrecompile = IJson(JSON_PRECOMPILE_ADDRESS);
        AddrPrecompile = IAddr(ADDR_PRECOMPILE_ADDRESS);
        BankPrecompile = IBank(BANK_PRECOMPILE_ADDRESS);
        Cw20Address = Cw20Address_;
    }

    function mint(address account, uint256 amount) external onlyOwner {
        require(account != address(0), "ERC20: mint to  the zero address");
        string memory recipient = _formatPayload(
            "recipient",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(account))
        );
        string memory amt = _formatPayload(
            "amount",
            _doubleQuotes(Strings.toString(amount))
        );
        string memory req = _curlyBrace(
            _formatPayload("mint", _curlyBrace(_join(recipient, amt, ",")))
        );
        _execute(req);
    }

    // Queries
    function decimals() public view override returns (uint8) {
        string memory req = _curlyBrace(_formatPayload("token_info", "{}"));
        bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
        return uint8(JsonPrecompile.extractAsUint256(response, "decimals"));
    }

    function balanceOf(address owner) public view override returns (uint256) {
        require(
            owner != address(0),
            "ERC20: balance query for the zero address"
        );
        string memory ownerAddr = _formatPayload(
            "address",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(owner))
        );
        string memory req = _curlyBrace(
            _formatPayload("balance", _curlyBrace(ownerAddr))
        );
        bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
        return JsonPrecompile.extractAsUint256(response, "balance");
    }

    function totalSupply() public view override returns (uint256) {
        string memory req = _curlyBrace(_formatPayload("token_info", "{}"));
        bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
        return JsonPrecompile.extractAsUint256(response, "total_supply");
    }

    // Transactions
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        string memory recipient = _formatPayload(
            "recipient",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(to))
        );
        string memory amt = _formatPayload(
            "amount",
            _doubleQuotes(Strings.toString(amount))
        );
        string memory req = _curlyBrace(
            _formatPayload("transfer", _curlyBrace(_join(recipient, amt, ",")))
        );
        _execute(req);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        require(
            owner != address(0),
            "ERC20: allowance query for the zero address"
        );
        string memory ownerAddr = _formatPayload(
            "owner",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(owner))
        );
        string memory spenderAddr = _formatPayload(
            "spender",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(spender))
        );
        string memory req = _curlyBrace(
            _formatPayload(
                "allowance",
                _curlyBrace(_join(ownerAddr, spenderAddr, ","))
            )
        );
        bytes memory response = WasmdPrecompile.query(Cw20Address, bytes(req));
        return JsonPrecompile.extractAsUint256(response, "allowance");
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        string memory fromAddr = _formatPayload(
            "owner",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(from))
        );
        string memory toAddr = _formatPayload(
            "recipient",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(to))
        );
        string memory amt = _formatPayload(
            "amount",
            _doubleQuotes(Strings.toString(amount))
        );
        string memory req = _curlyBrace(
            _formatPayload(
                "transfer_from",
                _curlyBrace(_join(fromAddr, _join(toAddr, amt, ","), ","))
            )
        );
        _execute(req);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal override {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        string memory spenderAddr = _formatPayload(
            "spender",
            _doubleQuotes(AddrPrecompile.getCosmosAddr(spender))
        );

        // reset allowance to zero
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance > 0) {
            string memory amtDecrease = _formatPayload(
                "amount",
                _doubleQuotes(Strings.toString(currentAllowance))
            );

            string memory decreaseAllowanceReq = _curlyBrace(
                _formatPayload(
                    "decrease_allowance",
                    _curlyBrace(_join(spenderAddr, amtDecrease, ","))
                )
            );
            _execute(decreaseAllowanceReq);
        }

        string memory amt = _formatPayload(
            "amount",
            _doubleQuotes(Strings.toString(amount))
        );
        string memory req = _curlyBrace(
            _formatPayload(
                "increase_allowance",
                _curlyBrace(_join(spenderAddr, amt, ","))
            )
        );
        _execute(req);

        emit Approval(owner, spender, amount);
    }

    function _execute(string memory req) internal returns (bytes memory) {
        (bool success, bytes memory ret) = WASMD_PRECOMPILE_ADDRESS
            .delegatecall(
                abi.encodeWithSignature(
                    "execute(string,bytes,bytes)",
                    Cw20Address,
                    bytes(req),
                    bytes("[]")
                )
            );
        require(
            success,
            string.concat(
                "CosmWasm execute failed. CosmWasm instruction: ",
                req
            )
        );
        return ret;
    }

    function _send(
        address to,
        string memory denom,
        uint256 amount
    ) internal returns (bytes memory) {
        (bool success, bytes memory ret) = BANK_PRECOMPILE_ADDRESS.delegatecall(
            abi.encodeWithSignature(
                "send(address,string,uint256)",
                to,
                denom,
                amount
            )
        );
        require(success, "Could not send ORAI to destination");
        return ret;
    }

    function _associatePubKey(
        string memory pubKeyHex
    ) internal returns (bytes memory) {
        (bool success, bytes memory ret) = ADDR_PRECOMPILE_ADDRESS.delegatecall(
            abi.encodeWithSignature("associatePubKey(string)", pubKeyHex)
        );
        require(success, "Could not send ORAI to destination");
        return ret;
    }

    function _formatPayload(
        string memory key,
        string memory value
    ) internal pure returns (string memory) {
        return _join(_doubleQuotes(key), value, ":");
    }

    function _curlyBrace(
        string memory s
    ) internal pure returns (string memory) {
        return string.concat("{", string.concat(s, "}"));
    }

    function _doubleQuotes(
        string memory s
    ) internal pure returns (string memory) {
        return string.concat('"', string.concat(s, '"'));
    }

    function _join(
        string memory a,
        string memory b,
        string memory separator
    ) internal pure returns (string memory) {
        return string.concat(a, string.concat(separator, b));
    }
}
