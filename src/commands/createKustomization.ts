import path from 'path';
import { Uri, window, workspace } from 'vscode';
import { AzureClusterProvider, azureTools, isAzureProvider } from '../azure/azureTools';
import { fluxTools } from '../flux/fluxTools';
import { validateKustomizationName } from '../flux/fluxUtils';
import { checkIfOpenedFolderGitRepositorySourceExists } from '../git/checkIfOpenedFolderGitRepositorySourceExists';
import { ClusterContextNode } from '../views/nodes/clusterContextNode';
import { getCurrentClusterInfo, refreshWorkloadsTreeView } from '../views/treeViews';
import { createGitRepository } from './createGitRepository';

/**
 * Create kustomization from File Explorer context menu
 * or `+` button or Command Palette.
 *
 * @param fileExplorerUri uri of the file in the file explorer
 */
export async function createKustomization(fileExplorerUri?: Uri): Promise<void> {

	const currentClusterInfo = await getCurrentClusterInfo();
	if (!currentClusterInfo) {
		return;
	}

	let kustomizationFsPath = '';
	let relativeKustomizationPath = '';
	/** Use this fsPath to create Git Repository when it doesn't exist  */
	let workspaceFolderUri: Uri | undefined;

	if (fileExplorerUri) {
		// executed from the VSCode File Explorer
		kustomizationFsPath = fileExplorerUri.fsPath;
	} else {
		// executed from Command Palette or from `+` button in Workloads tree view
		const pickedFolder = await window.showOpenDialog({
			title: 'Select a folder (used for "path" property on the new Kustomization object)',
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: workspace.workspaceFolders?.[0].uri,
		});
		if (!pickedFolder) {
			return;
		}
		kustomizationFsPath = pickedFolder[0].fsPath;
		workspaceFolderUri = pickedFolder[0];
	}

	// get relative path for the kustomization
	for (const folder of workspace.workspaceFolders || []) {
		const relativePath = path.relative(folder.uri.fsPath, kustomizationFsPath);
		if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
			relativeKustomizationPath = relativePath;
			if (!workspaceFolderUri) {
				workspaceFolderUri = folder.uri;
			}
			break;
		}
	}

	if (!workspaceFolderUri) {
		window.showErrorMessage('Failed to infer the opened workspace folder Uri.');
		return;
	}

	let gitSourceExists = await checkIfOpenedFolderGitRepositorySourceExists();
	let gitRepositoryName = gitSourceExists?.gitRepositoryName;

	if (isAzureProvider(currentClusterInfo.clusterProvider)) {
		await createKustomizationAzureCluster(gitRepositoryName, relativeKustomizationPath, workspaceFolderUri, currentClusterInfo.clusterNode, currentClusterInfo.clusterProvider);
	} else {
		await createKustomizationGenericCluster(gitRepositoryName, relativeKustomizationPath, workspaceFolderUri);
	}

	refreshWorkloadsTreeView();
}

/**
 * Create new kustomization using flux cli.
 *
 * @param gitRepositoryName existing git source name of the opened folder
 * @param relativeKustomizationPath future kustomization's spec `path` value
 * @param workspaceFolderUri opened in vscode folder containing the relative path
 */
async function createKustomizationGenericCluster(
	gitRepositoryName: string | undefined,
	relativeKustomizationPath: string,
	workspaceFolderUri: Uri,
): Promise<void> {

	if (!gitRepositoryName) {
		const createGitSourceButton = 'Create Git Repository';
		const modalResult = await window.showWarningMessage('Git repository source does not exist yet.', {
			modal: true,
		}, createGitSourceButton);
		if (modalResult !== createGitSourceButton) {
			return;
		}

		gitRepositoryName = await createGitRepository(workspaceFolderUri);
	}

	if (!gitRepositoryName) {
		window.showErrorMessage('Failed to get Git Repository Name');
		return;
	}

	let newKustomizationName = await window.showInputBox({
		title: 'Kustomization Name',
		value: `${gitRepositoryName}-kustomization`,
		validateInput: value => validateKustomizationName(value, gitRepositoryName, false),
	});

	if (newKustomizationName === undefined) {
		return;
	}

	if (!newKustomizationName) {
		newKustomizationName = gitRepositoryName;
	}

	await fluxTools.createKustomization(newKustomizationName, gitRepositoryName, relativeKustomizationPath);
}

/**
 * Create new kustomization using Azure cli.
 *
 * @param gitRepositoryName existing git source name of the opened folder
 * @param relativeKustomizationPath future kustomization's spec `path` value
 * @param workspaceFolderUri opened in vscode folder containing the relative path
 */
async function createKustomizationAzureCluster(
	gitRepositoryName: string | undefined,
	relativeKustomizationPath: string,
	workspaceFolderUri: Uri,
	clusterNode: ClusterContextNode,
	clusterProvider: AzureClusterProvider,
): Promise<void> {

	let newKustomizationName = await window.showInputBox({
		title: 'Kustomization Name',
		value: '',
		validateInput: value => validateKustomizationName(value, gitRepositoryName, true),
	});

	if (newKustomizationName === undefined) {
		return;
	}

	if (!gitRepositoryName) {

		const createGitSourceButton = 'Create Git Repository';
		const modalResult = await window.showWarningMessage('Git repository source does not exist yet.', {
			modal: true,
		}, createGitSourceButton);
		if (modalResult !== createGitSourceButton) {
			return;
		}

		await createGitRepository(workspaceFolderUri, newKustomizationName, relativeKustomizationPath);
	} else {
		await azureTools.createKustomization(newKustomizationName, gitRepositoryName, relativeKustomizationPath, clusterNode, clusterProvider);
	}
}
