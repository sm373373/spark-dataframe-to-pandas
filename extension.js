const vscode = require('vscode');

async function evaluateInCurrentFrame(expression) {
    const debugSession = vscode.debug.activeDebugSession;

    if (debugSession) {
        if (vscode.debug.activeStackItem instanceof vscode.DebugStackFrame) {
            const currentFrameId = vscode.debug.activeStackItem.frameId;

            // Evaluate expression in the current frame
            try {
                const result = await debugSession.customRequest('evaluate', {
                    expression: expression,
                    frameId: currentFrameId,
                    context: "repl"
                });

                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Error evaluating expression: ${error.message}`);
                return null;
            }
        }
    }

    return null;
}

async function refreshVariablesView(debugSession) {
    if (debugSession) {
        try {
            // Get the current thread id
            const threads = await debugSession.customRequest('threads');
            const currentThread = threads.threads.find(t => t.name === 'Main Thread') || threads.threads[0];
            
            if (currentThread) {
                // Step in place
                await debugSession.customRequest('stepIn', { threadId: currentThread.id });
                console.log('Variables refreshed');
            } else {
                console.error('Unable to find current thread');
            }
        } catch (err) {
            console.error('Error refreshing variables:', err);
        }
    }
}

function activate(context) {
    let disposable = vscode.commands.registerCommand('spark-dataframe-to-pandas.convertToPandas', async (variable) => {
        const debugSession = vscode.debug.activeDebugSession;

        if (debugSession && variable.variable) {
            const variableName = variable.variable.name

            // Check if the variable's type includes 'DataFrame'
            if (variable.variable.value.includes('DataFrame')) {
				const newVariableName = `${variableName}_pandas`;
				const expression = `${newVariableName} = ${variableName}.toPandas()`;
	
				const result = await evaluateInCurrentFrame(expression);
	
				if (result) {
                    await refreshVariablesView(debugSession);

					vscode.window.showInformationMessage(`Converted ${variableName} to ${newVariableName} (Pandas DataFrame).`);
				}
			} else {
				vscode.window.showErrorMessage(`${variableName} is not a PySpark DataFrame.`);
			}
        } else {
            vscode.window.showErrorMessage('No active debug session.');
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
