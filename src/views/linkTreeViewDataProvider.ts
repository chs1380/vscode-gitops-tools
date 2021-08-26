import {
  TreeItemCollapsibleState,
  Uri
} from 'vscode';
import {BuiltInCommands} from '../commands';
import {TreeViewItem} from './treeViewItem';
import {TreeViewDataProvider} from './treeViewDataProvider';
import {DocumentationLinks} from './documentationConfig';
import {Link} from './link';
import * as path from 'path';

export class LinkTreeViewDataProvider extends TreeViewDataProvider {

  /**
   * Creates documentation tree view from documenation links config.
   * @returns Documentation tree view items to display.
   */
  buildTree(): Promise<TreeViewItem[]> {
    const treeNodes: Array<TreeViewItem> = [];
    DocumentationLinks.forEach(link => {
      let treeNode = this.createLinkTreeViewItem(link, false); // no icon
      treeNode.collapsibleState = TreeItemCollapsibleState.Expanded;
      treeNodes.push(treeNode);
      // add doc section links
      link.links?.forEach(childLink => {
        let childNode: TreeViewItem = this.createLinkTreeViewItem(childLink);
        childNode.parent = treeNode;
        treeNode.addChild(childNode);
      });
    });
    return Promise.resolve(treeNodes);
  }

  /**
   * Creates link tree view item.
   * @param link Link config with title and link url.
   * @param showLinkIcon Optionally set link node icon.
   * @returns Link tree view item.
   */
  private createLinkTreeViewItem(link: Link, showLinkIcon: boolean = true): TreeViewItem {
    let args: Array<any> = [];
    args.push(Uri.parse(link.url));
    let treeViewItem = new TreeViewItem(link.title, link.url, BuiltInCommands.Open, args);
    if (showLinkIcon) {
      treeViewItem.setIcon({
        light: path.join(__filename, '..', '..', 'resources', 'icons', 'light', `link-external.svg`),
        dark: path.join(__filename, '..', '..', 'resources', 'icons', 'dark', `link-external.svg`)
      });
    }
    return treeViewItem;
  }
}