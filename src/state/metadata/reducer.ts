import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    RECEIVE_METADATA,
    RECEIVE_AGENT_IDS,
    RECEIVE_AGENT_NAMES,
} from "./constants";
import { MetadataStateBranch, ReceiveAction } from "./types";

export const initialState = {
    totalTime: 0,
    timeStep: 0,
    agentIds: [],
    agentUiNames: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_METADATA]: {
        accepts: (action: AnyAction): action is ReceiveAction =>
            action.type === RECEIVE_METADATA,
        perform: (state: MetadataStateBranch, action: ReceiveAction) => ({
            ...state,
            ...action.payload,
        }),
    },
    [RECEIVE_AGENT_IDS]: {
        accepts: (action: AnyAction): action is ReceiveAction =>
            action.type === RECEIVE_AGENT_IDS,
        perform: (state: MetadataStateBranch, action: ReceiveAction) => ({
            ...state,
            agentIds: action.payload,
        }),
    },
    [RECEIVE_AGENT_NAMES]: {
        accepts: (action: AnyAction): action is ReceiveAction =>
            action.type === RECEIVE_AGENT_NAMES,
        perform: (state: MetadataStateBranch, action: ReceiveAction) => ({
            ...state,
            agentUiNames: action.payload,
        }),
    },
};

export default makeReducer<MetadataStateBranch>(
    actionToConfigMap,
    initialState
);