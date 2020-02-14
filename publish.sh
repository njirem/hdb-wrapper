set -e

BOLD="\033[1m";
RESET="\033[0m";
RED="\033[31m";
YELLOW="\033[33m";

case $1 in
    patch|minor|major) ;;
    *) echo -e "$RED'$1' is not a recognised version increase${RESET}"; exit 1;;
esac
echo -e "\n-----\nAre you sure you want to publish a new '${BOLD}${1}${RESET}' version?\n-----"
select answer in "Yes" "No"; do
    if [ -z $answer  ]; then echo "Please select 1 or 2"; fi
    case $answer in
        Yes) break;;
        No) exit;;
    esac
done
echo -e "\n-----\n-----\n${YELLOW}${BOLD}Publishing new '$1' version to NPM${RESET}\n-----\n-----";

npm run build;
npm run test;
npm version $1;
git push --tags;
git push;

