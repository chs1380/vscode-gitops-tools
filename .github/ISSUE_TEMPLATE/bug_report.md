name: General Bug Report
description: 'Issue with the GitOps extension'
labels: []
body:
  - type: textarea
    attributes:
      label: Expected behaviour
      description: 'What do you think should have happened?'
    validations:
      required: true
  - type: textarea
    attributes:
      label: Actual behaviour
      description: What happened?
    validations:
      required: true
  - type: textarea
    attributes:
      label: Steps to reproduce
      description: 'Self-contained, minimal reproducing code samples are **extremely** helpful and will expedite addressing your issue. If you think a GIF of what is happening would be helpful, consider tools like https://www.cockos.com/licecap/, https://github.com/phw/peek or https://www.screentogif.com/'
    validations:
      required: true
  - type: textarea
    attributes:
      label: Versions
      description: 'Versions of the extension, the editor and the installed CLI tools. All of the versions can be found via the `GitOps: Show Installed Versions` command.'
    validations:
      required: true