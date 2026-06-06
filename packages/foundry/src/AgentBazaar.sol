// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentBazaar
/// @notice Append-only paid-call logger + per-agent counters for the Agent Bazaar live feed.
/// @dev NOT escrow. Money moves OFF this contract via x402 / USDC. This contract only records
///      that a paid call happened, giving the UI an instant, context-rich on-chain event to
///      stream live (USDC `Transfer` logs lack task context and may be facilitator-batched).
contract AgentBazaar {
    /// @notice Number of paid calls recorded per agentId.
    mapping(uint256 => uint256) public callCount;

    /// @notice Cumulative gross revenue per agentId, in USDC micro-units (1e-6 USDC).
    mapping(uint256 => uint256) public grossMicroUsdc;

    /// @notice Total calls across all agents (cheap global headline metric).
    uint256 public totalCalls;

    /// @notice Total gross across all agents, in USDC micro-units.
    uint256 public totalGrossMicroUsdc;

    /// @notice 👍 upvotes per agentId (on-chain reputation; maps to the ERC-8004 reputation model).
    mapping(uint256 => uint256) public upvotes;

    /// @notice Emitted once per paid agent call. The UI streams this over websockets.
    /// @param agentId        the agent that was hired
    /// @param caller         msg.sender — whoever logged the call (the server signer)
    /// @param priceMicroUsdc price paid for this call, in USDC micro-units
    /// @param taskHash       identifier tying this log to the off-chain task + x402 payment
    /// @param timestamp      block timestamp (uint64 is ample)
    event CallLogged(
        uint256 indexed agentId,
        address indexed caller,
        uint256 priceMicroUsdc,
        bytes32 taskHash,
        uint64 timestamp
    );

    /// @notice Emitted when a buyer rates an agent 👍. Streamed live to bump the leaderboard.
    event Rated(uint256 indexed agentId, address indexed rater, uint256 newUpvotes, uint64 timestamp);

    /// @notice Record a paid call. Cheap: a few SSTOREs + one event. No funds touched.
    /// @dev Callers should set a realistic gas limit — Monad bills `gas_limit` upfront.
    function logCall(uint256 agentId, uint256 priceMicroUsdc, bytes32 taskHash) external {
        unchecked {
            callCount[agentId] += 1;
            grossMicroUsdc[agentId] += priceMicroUsdc;
            totalCalls += 1;
            totalGrossMicroUsdc += priceMicroUsdc;
        }
        emit CallLogged(agentId, msg.sender, priceMicroUsdc, taskHash, uint64(block.timestamp));
    }

    /// @notice Rate an agent 👍 (one tap = one upvote). Cheap: one SSTORE + one event.
    function rate(uint256 agentId) external {
        unchecked {
            upvotes[agentId] += 1;
        }
        emit Rated(agentId, msg.sender, upvotes[agentId], uint64(block.timestamp));
    }

    /// @notice Convenience read for the leaderboard.
    /// @return calls number of paid calls for `agentId`
    /// @return gross cumulative gross for `agentId`, in USDC micro-units
    function agentStats(uint256 agentId) external view returns (uint256 calls, uint256 gross) {
        return (callCount[agentId], grossMicroUsdc[agentId]);
    }
}
