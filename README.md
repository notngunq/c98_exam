# C98 Exam
This repo includes 2 requirements located in 2 separate folders respectively
### Requirement 1
The NodeJS REST API to store and retrieve files. There are 3 features:
- Upload a new file
- Retrieve an uploaded file by name
- Delete an uploaded file by name

In addition, it also solves the problem of reusing the content of the same files to reduce storage space

#### Prerequisite
- [Node.js](https://nodejs.org/) v14+
#### Installation
- Clone repository and change working directory
```sh
git clone https://github.com/ngunq/c98_exam.git
cd c98_exam/requirement_1
```
- Install dependencies and start the server
```sh
npm install
npm start
```
The output should be like: `Server running on port 3000`
- We can also using docker to start the server by following commands
```sh
docker build -t c98_exam_api .
docker run --rm -p 3000:3000 --name c98_exam_container c98_exam_api
```
The output will also be: `Server running on port 3000`
Now, REST API server started on URL: http://127.0.0.1:3000 or http://localhost:3000

#### API Documentation
- https://documenter.getpostman.com/view/8058763/2s9YJezMDQ

### Requirement 2
- Using Terraform to provision infrastructure on AWS
- Using Ansible to configure AWS EC2 instance and deploy REST API
- Using Github Action for CI/CD

#### Prerequisite
- [AWS-CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Terraform](https://developer.hashicorp.com/terraform/downloads?product_intent=terraform) v1.5
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html/) v2.15
  
#### Installation
- Clone repository and change working directory
```sh
git clone https://github.com/ngunq/c98_exam.git
cd c98_exam/requirement_2
```
- Firstly, we need configure AWS Credential using AWS-CLI
```sh
aws configure
```
We have to specific information like
```
AWS Access Key ID [****************3FUO]:
AWS Secret Access Key [****************tUMV]: 
Default region name [ap-southeast-1]: 
Default output format [None]:
```

*Note: Make sure `Default region name` is `ap-southeast-1`* 
- Init Terraform configuration directory
```
terraform init
```
After init, a directory named `.terraform` contain configuration files was created
- Verify what Terraform will do before it actually does it
```
terraform plan
```
The output will give details of the resources that will be added/changed/destroyed and we can found the summary at the bottom like: `Plan: 10 to add, 0 to change, 0 to destroy.`
- Provision infrastructure
```sh
terraform apply --auto-approve
```
After provisioning, a directory named `.ssh` contain SSH private key file named `ssh_private_key` was created

At the console screen, we can find the public IP of the EC2 server that has provisioned and deployed the API like `server-ip = "13.212.20.236"`

- Using Ansible to deploy REST API
```sh
ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook --inventory <server-ip>, --private-key .ssh/ssh_private_key --user ec2-user deploy-playbook.yml
```
Now, we can access the REST API through URL: `http://<server-ip>:3000`

#### CI/CD using Github Action
First of all, you need to Fork this repository to your Github to be able to create your own Github Action Secrets
- Update repo URL in `deploy-playbook.yml` file
```sh
...
    - name: Clone app repository
      git:
        repo: <your forked repo URL>
        dest: /app/c98_exam
        force: true
        single_branch: yes
        version: main
...

```
- Config Github Action Secrets
    - At your Github forked repo, access `Settings > Secrets and variables > Actions` or access link `https://github.com/<username>/<repo-name>/settings/secrets/actions`
    - Create 2 repository secrets named:
        - `SSH_PRIVATE_KEY` with value is content of above provisioned `.ssh/ssh_private_key` file
        - `SERVER_IP` with value of above provisioned `server-ip`
- Trigger Github Workflow
    - Change to `Actions` tab on Github UI 
    - If you get a warning about available workflows on repo, just accept enable them
    - In left menu pane, you can found a workflow named `DeployCI`
    - Select this workflow, then click `Run workflow` on branch `main`
    - Now, Github will trigger a workflow to deploy REST API to your server. Click on running workflow to retrieve running log
- Automate deployment
    - Make a change on your code
    - Change to `Actions` tab on Github UI , you can see another DeployCI workflow will trigger automatically to deploy your new code

*Note: you can access to update workflow in directory `.github/workflows`*
