import { AxiosResponse } from "axios";
import { createLogic } from "redux-logic";
import queryString from "query-string";
// NOTE: importing @aics/simularium-viewer here currently breaks ability to compile in testing setup
// TODO: work on test babel setup, or switch to jest?

import { ReduxLogicDeps } from "../types";

import { getSimulariumController, getSimulariumFile } from "./selectors";
import {
    receiveMetadata,
    receiveSimulariumFile,
    requestCachedPlotData,
    setSimulariumController,
} from "./actions";
import {
    LOAD_LOCAL_FILE_IN_VIEWER,
    VIEWER_LOADING,
    LOAD_NETWORKED_FILE_IN_VIEWER,
    REQUEST_PLOT_DATA,
    CLEAR_SIMULARIUM_FILE,
    VIEWER_EMPTY,
} from "./constants";
import { ReceiveAction, LocalSimFile, FrontEndError } from "./types";
import { VIEWER_ERROR } from "./constants";
import { setViewerStatus } from "../metadata/actions";
import { URL_PARAM_KEY_FILE_NAME } from "../../constants";
import { batchActions } from "../util";
import { initialState } from "./reducer";
import {
    changeTime,
    resetAgentSelectionsAndHighlights,
} from "../selection/actions";
import { initialState as initialSelectionState } from "../selection/reducer";
import { getCurrentTime } from "../selection/selectors";

const netConnectionSettings = {
    serverIp: process.env.BACKEND_SERVER_IP,
    serverPort: 9002,
};

const clearSimulariumFile = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, action } = deps;
        const controller = getSimulariumController(getState());
        const clearMetaData = receiveMetadata({
            plotData: initialState.plotData,
            firstFrameTime: initialState.firstFrameTime,
            lastFrameTime: initialState.lastFrameTime,
            timeStep: initialState.timeStep,
            agentId: initialState.agentIds,
            agentUiNames: initialState.agentUiNames,
        });
        const resetTime = changeTime(initialSelectionState.time);
        const resetVisibility = resetAgentSelectionsAndHighlights();

        const actions = [clearMetaData, resetTime, resetVisibility];
        let setViewerStatusAction;
        // if requesting new sim file, set loading
        if (action.payload && action.payload.name) {
            setViewerStatusAction = setViewerStatus({
                status: VIEWER_LOADING,
            });
        } else {
            setViewerStatusAction = setViewerStatus({
                status: VIEWER_EMPTY,
            });
        }
        actions.push(setViewerStatusAction);
        dispatch(batchActions(actions));
        //only clear file if not requesting new one
        if (controller && !action.payload) {
            controller.clearFile();
        }
        done();
    },
    type: [CLEAR_SIMULARIUM_FILE],
});

const requestPlotDataLogic = createLogic({
    process(
        deps: ReduxLogicDeps,
        dispatch: (action: ReceiveAction) => void,
        done: () => void
    ) {
        const { baseApiUrl, plotDataUrl, httpClient, action } = deps;
        httpClient
            .get(`${plotDataUrl}${baseApiUrl}/${action.payload.url}`)
            .then((metadata: AxiosResponse) => {
                dispatch(receiveMetadata({ plotData: metadata.data.data }));
            })
            .catch((reason) => {
                console.log(reason);
            })
            .then(done);
    },
    type: REQUEST_PLOT_DATA,
});

const loadNetworkedFile = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;
        const currentState = getState();

        const simulariumFile = action.payload;
        dispatch({ type: CLEAR_SIMULARIUM_FILE });

        let simulariumController = getSimulariumController(currentState);
        if (!simulariumController) {
            if (action.controller) {
                simulariumController = action.controller;
                dispatch(setSimulariumController(simulariumController));
            }
        }
        if (!simulariumController.netConnection) {
            simulariumController.configureNetwork(netConnectionSettings);
        }
        // if requested while playing, just pause sim until done loading
        simulariumController.pause();

        simulariumController
            .changeFile(simulariumFile.name)
            .then(() => {
                return dispatch(receiveSimulariumFile(simulariumFile));
            })
            .then(() => {
                return dispatch(
                    requestCachedPlotData({
                        url: `${
                            simulariumFile.name.split(".")[0]
                        }/plot-data.json`, // placeholder for however we organize this data in s3
                    })
                );
            })
            .then(done)
            .catch((error: Error) => {
                dispatch(
                    setViewerStatus({
                        status: VIEWER_ERROR,
                        errorMessage: error.message,
                    })
                );
            });
    },
    type: LOAD_NETWORKED_FILE_IN_VIEWER,
});

const clearOutFileTrajectoryUrlParam = () => {
    const parsed = queryString.parse(location.search);
    if (parsed[URL_PARAM_KEY_FILE_NAME]) {
        const url = new URL(location.href); // no IE support
        history.pushState(null, ""); // save current state so back button works
        url.searchParams.delete(URL_PARAM_KEY_FILE_NAME);
        history.replaceState(null, "", url.href);
    }
};

const loadLocalFile = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;
        const currentState = getState();
        const simulariumController = getSimulariumController(currentState);
        const lastSimulariumFile: LocalSimFile = getSimulariumFile(
            currentState
        );
        const simulariumFile = action.payload;

        if (lastSimulariumFile) {
            if (
                lastSimulariumFile.name === simulariumFile.name &&
                lastSimulariumFile.lastModified === simulariumFile.lastModified
            ) {
                // exact same file loaded again, dont need to reload anything
                return;
            }
        }
        console.log("before", getCurrentTime(getState()));

        dispatch({ type: CLEAR_SIMULARIUM_FILE });
        console.log("after", getCurrentTime(getState()));
        clearOutFileTrajectoryUrlParam();
        // if requested while playing, just pause sim until done loading
        simulariumController.pause();

        simulariumController
            .changeFile(simulariumFile.name, true, simulariumFile.data)
            .then(() => {
                dispatch(receiveSimulariumFile(simulariumFile));
            })
            .then(() => {
                dispatch(
                    receiveMetadata({
                        plotData: simulariumFile.data.plotData.data,
                    })
                );
            })
            .then(done)
            .catch((error: FrontEndError) => {
                dispatch(
                    setViewerStatus({
                        status: VIEWER_ERROR,
                        errorMessage: error.message,
                        htmlData: error.htmlData || "",
                    })
                );
                done();
            });
    },
    type: LOAD_LOCAL_FILE_IN_VIEWER,
});

export default [
    requestPlotDataLogic,
    loadLocalFile,
    loadNetworkedFile,
    clearSimulariumFile,
];
