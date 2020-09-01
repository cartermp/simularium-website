import React, { useState } from "react";
import { Tree } from "antd";
import { ActionCreator } from "redux";
import { ChangeAgentsRenderingStateAction } from "../../state/selection/types";
import { TreeProps } from "antd/lib/tree";

interface CheckBoxTreeProps extends TreeProps {
    agentsChecked: string[];
    handleCheck: ActionCreator<ChangeAgentsRenderingStateAction>;
    title: string;
}
const CheckBoxTree = ({
    agentsChecked,
    treeData,
    handleCheck,
    title,
}: CheckBoxTreeProps) => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>(agentsChecked);
    const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

    const onExpand = (expandedKeys: string[]) => {
        // if not set autoExpandParent to false, if children expanded, parent can not collapse.
        // or, you can remove all expanded children keys.
        setExpandedKeys(expandedKeys);
        setAutoExpandParent(false);
    };

    const onCheck = (
        checkedKeys: string[] | { checked: string[]; halfChecked: string[] }
    ) => {
        handleCheck(checkedKeys);
    };

    return (
        <>
            <label>{title}</label>
            <Tree
                checkable
                onExpand={onExpand}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                onCheck={onCheck}
                checkedKeys={agentsChecked}
                treeData={treeData}
            />
        </>
    );
};

export default CheckBoxTree;