import React from "react";
import { useDispatch } from "react-redux";
import TutorialPage from "../components/TutorialPage";
import LandingPage from "../components/LandingPage";
import Simularium from "../containers/Simularium";
import { useLocation } from "react-router-dom";
import { store } from "..";
import { clearSimulariumFile } from "../state/metadata/actions";
import {
    getSimulariumController,
    getSimulariumFile,
} from "../state/metadata/selectors";

export const VIEWER_PATHNAME = "/viewer";
export const TUTORIAL_PATHNAME = "/tutorial";

interface LocationWithState extends Location {
    state: {
        localFile?: boolean;
    };
}
function RenderSimularium() {
    /**
     * Gets called every time the app navigates to the Simularium page.
     * There are 2 possible url types and 3 different states the viewer should be in
     * when we get there:
     * 1. Empty viewer, by clicking "launch viewer" or "load your own data" card; url: '/viewer'
     * 2. Loading network file; url: '/viewer?trajFileName=FILE_NAME'
     * 3. Loading a local file through the dropdown, will be reflected in the location state; url: '/viewer'
     */
    const location = useLocation() as LocationWithState;
    const dispatch = useDispatch();
    React.useEffect(() => {
        const state = store.getState();
        const controller = getSimulariumController(state);
        const simFile = getSimulariumFile(state);
        // got here from the "load local file button" so the app is going to
        // `/viewer`, but the loadFile action will take care of resetting state
        // if the user clicks "Open"
        if (location.state && location.state.localFile) {
            return;
        }
        if (!location.search && controller && simFile.name) {
            // going to /viewer, clear out any existing files
            dispatch(clearSimulariumFile({ newFile: false }));
        }
    }, [location]);

    return <Simularium />;
}

export default [
    {
        name: "Home",
        component: LandingPage,
        path: "/",
    },
    {
        name: "Getting Started",
        component: TutorialPage,
        path: TUTORIAL_PATHNAME,
    },
    {
        name: "Run Simulations",
        component: RenderSimularium,
        path: VIEWER_PATHNAME,
    },
];
