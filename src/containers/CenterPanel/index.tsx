import * as React from "react";
import { ActionCreator } from "redux";
import { AgentSimController } from "agentviz-viewer";

import ThreeDViewer from "../../components/Viewer";
import {
    getCurrentTime,
    getNumberCollapsed,
} from "../../state/selection/selectors";
import { State } from "../../state/types";
import { connect } from "react-redux";
import { changeTime } from "../../state/selection/actions";
import PlaybackControls from "../../components/PlaybackControls";
import { ChangeTimeAction } from "../../state/selection/types";
import { HEADER_HEIGHT } from "../../constants";

interface CenterPanelProps {
    time: number;
    numberPanelsCollapsed: number;
    changeTime: ActionCreator<ChangeTimeAction>;
}

interface CenterPanelState {
    isPlaying: boolean;
    isInitialPlay: boolean;
    highlightId: number;
    particleTypeIds: string[];
    height: number;
    width: number;
}

const netConnectionSettings = {
    serverIp: "52.15.70.94",
    serverPort: 9002,
};

const agentSim = new AgentSimController(netConnectionSettings, {
    trajectoryPlaybackFile: "actin5-1.h5",
});

const interval = 500;

class CenterPanel extends React.Component<CenterPanelProps, CenterPanelState> {
    private animationTimer: number | null;
    private centerContent = React.createRef<HTMLDivElement>();

    constructor(props: CenterPanelProps) {
        super(props);
        this.animationTimer = null;
        this.playBackOne = this.playBackOne.bind(this);
        this.playForwardOne = this.playForwardOne.bind(this);
        this.playFoward = this.playFoward.bind(this);
        this.startPlay = this.startPlay.bind(this);
        this.pause = this.pause.bind(this);
        this.receiveTimeChange = this.receiveTimeChange.bind(this);
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.state = {
            isPlaying: false,
            isInitialPlay: true,
            highlightId: -1,
            particleTypeIds: [],
        };
    }

    public componentDidMount() {
        if (this.centerContent.current) {
            const width = this.centerContent.current.offsetWidth;
            console.log(width, this.centerContent);
            const height = window.innerHeight - HEADER_HEIGHT;
            this.setState({ height, width });
        }
    }

    public componentDidUpdate(prevProps: CenterPanelProps) {
        if (
            this.centerContent.current &&
            this.props.numberPanelsCollapsed !== prevProps.numberPanelsCollapsed
        ) {
            const width = this.centerContent.current.offsetWidth;
            const height = window.innerHeight - HEADER_HEIGHT;
            this.setState({ height, width });
        }
    }

    public playForwardOne() {
        const { time, changeTime } = this.props;
        changeTime(time + interval);
    }

    public playBackOne() {
        const { time, changeTime } = this.props;
        if (time - interval >= 0) {
            changeTime(time - interval);
        }
    }

    public playFoward(isInitalPlay: boolean) {
        if (isInitalPlay || this.state.isPlaying) {
            this.playForwardOne();

            this.animationTimer = window.setTimeout(
                () => this.playFoward(false),
                100
            );
        }
    }

    public handleJsonMeshData(jsonData: any) {
        const particleTypeIds = Object.keys(jsonData);
        this.setState({ particleTypeIds });
    }

    public highlightParticleType(typeId: number) {
        const highlightId = typeId;
        this.setState({ highlightId });
    }

    public startPlay() {
        const { time } = this.props;
        if (this.state.isPlaying) {
            return;
        }
        if (this.state.isInitialPlay) {
            agentSim.start();
            this.setState({ isInitialPlay: false });
        } else {
            agentSim.playFromCache(time / 1000);
        }
        this.setState({ isPlaying: true });
    }

    public pause() {
        agentSim.pause();
        this.setState({ isPlaying: false });
    }

    public receiveTimeChange(timeData: any) {
        const { changeTime } = this.props;
        return changeTime(timeData.time / 1000);
    }

    public render(): JSX.Element {
        const { time, numberPanelsCollapsed } = this.props;
        console.log(numberPanelsCollapsed);
        return (
            <div ref={this.centerContent} className="center-panel-container">
                <ThreeDViewer
                    time={time}
                    width={this.state.width - 60}
                    height={this.state.height}
                    agentSim={agentSim}
                    onTimeChange={this.receiveTimeChange}
                    highlightId={this.state.highlightId}
                    handleJsonMeshData={this.handleJsonMeshData}
                />
                <PlaybackControls
                    playHandler={this.startPlay}
                    time={time}
                    pauseHandler={this.pause}
                    prevHandler={this.playBackOne}
                    nextHandler={this.playForwardOne}
                    isPlaying={this.state.isPlaying}
                />
            </div>
        );
    }
}

function mapStateToProps(state: State) {
    return {
        time: getCurrentTime(state),
        numberPanelsCollapsed: getNumberCollapsed(state),
    };
}

const dispatchToPropsMap = {
    changeTime,
};

export default connect(
    mapStateToProps,
    dispatchToPropsMap
)(CenterPanel);
